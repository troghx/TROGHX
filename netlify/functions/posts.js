// netlify/functions/posts.js
import { neon } from "@neondatabase/serverless";

const DB_URL =
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL_UNPOOLED;

if (!DB_URL) {
  console.warn("[posts] No DATABASE_URL found in env");
}

const sql = DB_URL ? neon(DB_URL) : null;

const json = (status, data, extraHeaders = {}) => ({
  statusCode: status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Cache-Control": "no-store",
    ...extraHeaders,
  },
  body: JSON.stringify(data),
});

function getIdFromPath(path) {
  // /.netlify/functions/posts/123  -> "123"
  const parts = (path || "").split("/");
  const last = parts[parts.length - 1];
  return last && last !== "posts" ? last : null;
}

export async function handler(event) {
  try {
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
        },
        body: "",
      };
    }

    // health check
    if ((event.queryStringParameters || {}).health) {
      return json(200, {
        ping: 1,
        env_seen: {
          DATABASE_URL: !!process.env.DATABASE_URL,
          NETLIFY_DATABASE_URL: !!process.env.NETLIFY_DATABASE_URL,
          NETLIFY_DATABASE_URL_UNPOOLED: !!process.env.NETLIFY_DATABASE_URL_UNPOOLED,
        },
        url_len: (DB_URL || "").length,
      });
    }

    if (!sql) return json(500, { error: "DB not configured" });

    // ---- GET /posts or /posts/:id
    if (event.httpMethod === "GET") {
      const id = getIdFromPath(event.path);
      if (id) {
        // Detalle (incluye preview_video)
        const rows =
          await sql`SELECT id, title, image, description, preview_video, download_url, created_at
                    FROM posts WHERE id = ${id} LIMIT 1`;
        if (!rows.length) return json(404, { error: "Not found" });
        return json(200, rows[0]);
      }

      // Listado
      const qp = event.queryStringParameters || {};
      const lite = qp.lite === "1" || qp.lite === "true";
      const limit = Math.min(Math.max(parseInt(qp.limit || "24", 10) || 24, 1), 100);

      if (lite) {
        // sin preview_video -> respuesta mucho más ligera
        const rows =
          await sql`SELECT id, title, image, description, download_url, created_at
                    FROM posts
                    ORDER BY created_at DESC
                    LIMIT ${limit}`;
        return json(200, rows);
      } else {
        const rows =
          await sql`SELECT id, title, image, description, preview_video, download_url, created_at
                    FROM posts
                    ORDER BY created_at DESC
                    LIMIT ${limit}`;
        return json(200, rows);
      }
    }

    // ---- POST /posts (crear)
    if (event.httpMethod === "POST") {
      const auth = event.headers?.authorization || "";
      const token = auth.replace(/^Bearer\s+/i, "").trim();
      const envToken = process.env.AUTH_TOKEN || "";
      if (!envToken || token !== envToken) {
        return json(401, { error: "Unauthorized" });
      }

      const body = JSON.parse(event.body || "{}");
      const { title, image, description, previewVideo, preview_video, downloadUrl, detailsUrl } = body;

      if (!title || !image || !description) {
        return json(400, { error: "Missing fields" });
      }

      const pv = previewVideo ?? preview_video ?? null;

      const rows =
        await sql`INSERT INTO posts (title, image, description, preview_video, download_url, details_url)
                  VALUES (${title}, ${image}, ${description}, ${pv}, ${downloadUrl || null}, ${detailsUrl || null})
                  RETURNING id`;

      return json(200, { ok: true, id: rows[0].id });
    }

    // ---- DELETE /posts/:id
    if (event.httpMethod === "DELETE") {
      const auth = event.headers?.authorization || "";
      const token = auth.replace(/^Bearer\s+/i, "").trim();
      const envToken = process.env.AUTH_TOKEN || "";
      if (!envToken || token !== envToken) {
        return json(401, { error: "Unauthorized" });
      }
      const id = getIdFromPath(event.path);
      if (!id) return json(400, { error: "Missing id" });

      await sql`DELETE FROM posts WHERE id = ${id}`;
      return json(200, { ok: true });
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    console.error("[posts] error", err);
    return json(500, { error: "Internal Server Error" });
  }
}
