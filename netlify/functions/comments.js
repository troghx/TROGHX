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
    "Access-Control-Allow-Methods": "GET,POST,DELETE,PATCH,OPTIONS",
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
  await sql`ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id uuid`;
  await sql`ALTER TABLE comments ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ`;
  await sql`CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments (parent_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_comments_pinned ON comments (pinned_at DESC NULLS LAST)`;
  await sql`
    DO $$
    BEGIN
      ALTER TABLE comments
        ADD CONSTRAINT comments_parent_fk
        FOREIGN KEY (parent_id)
        REFERENCES comments(id)
        ON DELETE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `;
  await sql`
    DO $$
    BEGIN
      ALTER TABLE comments
        ADD CONSTRAINT comments_post_fk
        FOREIGN KEY (post_id)
        REFERENCES posts(id)
        ON DELETE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN undefined_table THEN NULL;
    END $$;
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_comments_created_desc ON comments (created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_comments_post_pin_created ON comments (post_id, pinned_at DESC, created_at ASC)`;
}

function mapRow(row = {}) {
  return {
    id: row.id,
    postId: row.postId || row.post_id,
    alias: row.alias || "Anónimo",
    message: row.message || "",
    role: row.role === "admin" ? "admin" : "user",
    createdAt: row.createdAt || row.created_at || null,
    parentId: row.parentId || row.parent_id || null,
    pinnedAt: row.pinnedAt || row.pinned_at || null,
    postTitle: row.postTitle || row.post_title || null,
    postCategory: row.postCategory || row.post_category || null,
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
      const latestFlag =
        params.latest === "1" ||
        params.latest === "true" ||
        params.feed === "1" ||
        params.feed === "true";

      if (latestFlag) {
        const limit = Math.min(Math.max(parseInt(params.limit || "20", 10) || 20, 1), 100);
        const sinceRaw = params.since || params.after || null;
        const sinceTime = sinceRaw ? Date.parse(sinceRaw) : NaN;
        const sinceIso = Number.isNaN(sinceTime) ? null : new Date(sinceTime).toISOString();

        try {
          const rows = sinceIso
            ? await sql`
              SELECT c.id,
                     c.post_id AS "postId",
                     c.alias,
                     c.message,
                     c.role,
                     c.created_at AS "createdAt",
                     c.parent_id AS "parentId",
                     c.pinned_at AS "pinnedAt",
                     p.title AS "postTitle",
                     p.category AS "postCategory"
              FROM comments c
              JOIN posts p ON p.id = c.post_id
              WHERE c.created_at > ${sinceIso}
              ORDER BY c.created_at DESC
              LIMIT ${limit}
            `
            : await sql`
              SELECT c.id,
                     c.post_id AS "postId",
                     c.alias,
                     c.message,
                     c.role,
                     c.created_at AS "createdAt",
                     c.parent_id AS "parentId",
                     c.pinned_at AS "pinnedAt",
                     p.title AS "postTitle",
                     p.category AS "postCategory"
              FROM comments c
              JOIN posts p ON p.id = c.post_id
              ORDER BY c.created_at DESC
              LIMIT ${limit}
            `;
          return json(200, rows.map(mapRow), cacheHdr(5));
        } catch (err) {
          console.error("[GET /comments feed]", err);
          return json(500, { error: "Feed failed", detail: String(err.message || err) });
        }
      }

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
                 created_at AS "createdAt",
                 parent_id AS "parentId",
                 pinned_at AS "pinnedAt"
          FROM comments
          WHERE post_id = ${postId}
          ORDER BY pinned_at DESC NULLS LAST, created_at ASC
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

      const parentId =
        normPostId(body.parentId) ||
        normPostId(body.parent_id) ||
        normPostId(body.replyTo) ||
        null;

      if (parentId) {
        try {
          const parentRows = await sql`
            SELECT id, post_id AS "postId", parent_id AS "parentId"
            FROM comments
            WHERE id = ${parentId}
            LIMIT 1
          `;
          const parent = parentRows[0];
          if (!parent || parent.postId !== postId) {
            return json(400, { error: "invalid parent" });
          }
        } catch (err) {
          console.error("[POST /comments] parent lookup", err);
          return json(500, { error: "Parent lookup failed", detail: String(err.message || err) });
        }
      }

      try {
        const rows = await sql`
          INSERT INTO comments (post_id, alias, email, message, role, parent_id)
          VALUES (${postId}, ${alias}, ${email}, ${message}, ${role}, ${parentId})
          RETURNING id,
                    post_id AS "postId",
                    alias,
                    message,
                    role,
                    created_at AS "createdAt",
                    parent_id AS "parentId",
                    pinned_at AS "pinnedAt"
        `;
        return json(201, mapRow(rows[0] || {}));
      } catch (err) {
        console.error("[POST /comments]", err);
        return json(500, { error: "Create failed", detail: String(err.message || err) });
      }
    }

    // ---------- PIN / UPDATE ----------
    if (event.httpMethod === "PATCH" && event.path.includes("/comments/")) {
      const authResult = auth(event);
      if (!authResult.ok) return authResult.res;

      const id = getCommentId(event);
      if (!id) return json(400, { error: "invalid id" });

      const params = qs(event);
      const postId =
        normPostId(params.postId) || normPostId(params.post_id) || normPostId(params.id);

      const body = parseBody(event);
      const pinnedValue = Boolean(body?.pinned);

      try {
        let rows;
        if (pinnedValue) {
          if (postId) {
            rows = await sql`
              UPDATE comments
              SET pinned_at = now()
              WHERE id = ${id}
                AND parent_id IS NULL
                AND post_id = ${postId}
              RETURNING id,
                        post_id AS "postId",
                        alias,
                        message,
                        role,
                        created_at AS "createdAt",
                        parent_id AS "parentId",
                        pinned_at AS "pinnedAt"
            `;
          } else {
            rows = await sql`
              UPDATE comments
              SET pinned_at = now()
              WHERE id = ${id}
                AND parent_id IS NULL
              RETURNING id,
                        post_id AS "postId",
                        alias,
                        message,
                        role,
                        created_at AS "createdAt",
                        parent_id AS "parentId",
                        pinned_at AS "pinnedAt"
            `;
          }
        } else {
          if (postId) {
            rows = await sql`
              UPDATE comments
              SET pinned_at = NULL
              WHERE id = ${id}
                AND parent_id IS NULL
                AND post_id = ${postId}
              RETURNING id,
                        post_id AS "postId",
                        alias,
                        message,
                        role,
                        created_at AS "createdAt",
                        parent_id AS "parentId",
                        pinned_at AS "pinnedAt"
            `;
          } else {
            rows = await sql`
              UPDATE comments
              SET pinned_at = NULL
              WHERE id = ${id}
                AND parent_id IS NULL
              RETURNING id,
                        post_id AS "postId",
                        alias,
                        message,
                        role,
                        created_at AS "createdAt",
                        parent_id AS "parentId",
                        pinned_at AS "pinnedAt"
            `;
          }
        }
        if (!rows.length)
          return json(404, { error: "not found" });
        return json(200, mapRow(rows[0] || {}));
      } catch (err) {
        console.error("[PATCH /comments/:id]", err);
        return json(500, { error: "Update failed", detail: String(err.message || err) });
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
