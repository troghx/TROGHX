// netlify/functions/comments.js
import { neon, neonConfig } from "@neondatabase/serverless";
import { json as baseJson } from "./utils.js";

neonConfig.fetchConnectionCache = true;

const DB_URL =
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL_UNPOOLED;

const sql = DB_URL ? neon(DB_URL) : null;

let schemaReady = false;

const json = (status, data, extra = {}) =>
  baseJson(status, data, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    ...extra,
  });

const cacheHdr = (sec = 30) => ({
  "Cache-Control": `public, max-age=${sec}, stale-while-revalidate=30`,
});

const qs = (e) => e.queryStringParameters || {};

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(value || "").trim()
  );
}

function normPostId(value) {
  const s = String(value || "").trim();
  return isUuid(s) ? s : null;
}

function getCommentId(event) {
  const p = String(event.path || "");
  const parts = p.split("/").filter(Boolean);
  const i = parts.lastIndexOf("comments");
  const id = i >= 0 ? parts[i + 1] : null;
  return normPostId(id);
}

function parseBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch (err) {
    return {};
  }
}

function sanitizeText(value = "", { max = 512, fallback = "" } = {}) {
  const s = String(value || "").replace(/[\u0000-\u001F\u007F]+/g, "").trim();
  if (!s) return fallback;
  if (s.length > max) return s.slice(0, max).trim();
  return s;
}

function sanitizeEmail(value) {
  const s = String(value || "").trim();
  if (!s) return null;
  if (s.length > 254) return null;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(s)) return null;
  return s.toLowerCase();
}

function auth(event) {
  const authHeader = event.headers?.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const envToken = (process.env.AUTH_TOKEN || "").trim();
  if (!envToken || token !== envToken) {
    return { ok: false, res: json(401, { error: "Unauthorized" }) };
  }
  return { ok: true };
}

async function ensureSchema() {
  await sql`CREATE TABLE IF NOT EXISTS comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid NOT NULL,
    alias TEXT NOT NULL DEFAULT 'Anónimo',
    email TEXT,
    message TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments (post_id, created_at)`;
}

function mapRow(row = {}) {
  return {
    id: row.id,
    postId: row.postId || row.post_id,
    alias: row.alias || "Anónimo",
    message: row.message || "",
    role: row.role === "admin" ? "admin" : "user",
    createdAt: row.createdAt || row.created_at || null,
  };
}

export async function handler(event) {
  try {
    if (event.httpMethod === "OPTIONS") return json(204, {}, cacheHdr(300));
    if (!sql) return json(500, { error: "DB not configured" });

    if (!schemaReady) {
      await ensureSchema();
      schemaReady = true;
    }

    const params = qs(event);

    // ---------- LIST ----------
    if (event.httpMethod === "GET" && event.path.endsWith("/comments")) {
      const postId =
        normPostId(params.postId) || normPostId(params.post_id) || normPostId(params.id);
      if (!postId) return json(400, { error: "missing postId" });

      try {
        const rows = await sql`
          SELECT id,
                 post_id AS "postId",
                 alias,
                 message,
                 role,
                 created_at AS "createdAt"
          FROM comments
          WHERE post_id = ${postId}
          ORDER BY created_at ASC
        `;
        return json(200, rows.map(mapRow), cacheHdr(15));
      } catch (err) {
        console.error("[GET /comments]", err);
        return json(500, { error: "List failed", detail: String(err.message || err) });
      }
    }

    // ---------- CREATE ----------
    if (event.httpMethod === "POST" && event.path.endsWith("/comments")) {
      const body = parseBody(event);
      const postId =
        normPostId(body.postId) || normPostId(body.post_id) || normPostId(body.id);
      if (!postId) return json(400, { error: "missing postId" });

      const message = sanitizeText(body.message, { max: 2000, fallback: "" });
      if (!message) return json(400, { error: "missing message" });

      const alias = sanitizeText(body.alias, { max: 64, fallback: "Anónimo" });
      const email = sanitizeEmail(body.email);
      const isAdminComment = auth(event).ok;
      const role = isAdminComment ? "admin" : "user";

      try {
        const rows = await sql`
          INSERT INTO comments (post_id, alias, email, message, role)
          VALUES (${postId}, ${alias}, ${email}, ${message}, ${role})
          RETURNING id,
                    post_id AS "postId",
                    alias,
                    message,
                    role,
                    created_at AS "createdAt"
        `;
        return json(201, mapRow(rows[0] || {}));
      } catch (err) {
        console.error("[POST /comments]", err);
        return json(500, { error: "Create failed", detail: String(err.message || err) });
      }
    }

    // ---------- DELETE ----------
    if (event.httpMethod === "DELETE" && event.path.includes("/comments/")) {
      const authResult = auth(event);
      if (!authResult.ok) return authResult.res;

      const id = getCommentId(event);
      if (!id) return json(400, { error: "invalid id" });

      const postId =
        normPostId(params.postId) || normPostId(params.post_id) || normPostId(params.id);

      try {
        let rows;
        if (postId) {
          rows = await sql`
            DELETE FROM comments
            WHERE id = ${id} AND post_id = ${postId}
            RETURNING id
          `;
        } else {
          rows = await sql`
            DELETE FROM comments
            WHERE id = ${id}
            RETURNING id
          `;
        }
        if (!rows.length) return json(404, { error: "not found" });
        return json(200, { success: true });
      } catch (err) {
        console.error("[DELETE /comments/:id]", err);
        return json(500, { error: "Delete failed", detail: String(err.message || err) });
      }
    }

    return json(405, { error: "Method Not Allowed" });
  } catch (err) {
    console.error("[comments handler]", err);
    return json(500, { error: "Unexpected error", detail: String(err.message || err) });
  }
}
