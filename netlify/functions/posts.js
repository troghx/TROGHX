// netlify/functions/posts.js
import { neon } from "@neondatabase/serverless";

const DB_URL =
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL_UNPOOLED;

const sql = DB_URL ? neon(DB_URL) : null;

const json = (status, data, extra = {}) => ({
  statusCode: status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Cache-Control": "no-store",
    ...extra,
  },
  body: JSON.stringify(data),
});

const getIdFromPath = (path) => {
  const parts = (path || "").split("/");
  const last = parts[parts.length - 1];
  return last && last !== "posts" ? last : null;
};

export async function handler(event) {
  try {
    // Preflight
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
        },
        body: "",
      };
    }

    if (!sql) return json(500, { error: "DB not configured" });

    // ---------- GET /posts or /posts/:id
    if (event.httpMethod === "GET") {
      const id = getIdFromPath(event.path);
      if (id) {
        const rows =
          await sql`SELECT id, title, image, description, preview_video, download_url, created_at
                    FROM posts WHERE id = ${id} LIMIT 1`;
        if (!rows.length) return json(404, { error: "Not found" });
        return json(200, rows[0]);
      }

      const qp = event.queryStringParameters || {};
      const lite = qp.lite === "1" || qp.lite === "true";
      const limit = Math.min(Math.max(parseInt(qp.limit || "24", 10) || 24, 1), 100);

      if (lite) {
        // Sin preview_video (ligero)
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

    // ---------- Auth para escritura
    const auth = event.headers?.authorization || "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    const envToken = process.env.AUTH_TOKEN || "";
    if (!envToken || token !== envToken) {
      return json(401, { error: "Unauthorized" });
    }

    // ---------- POST /posts (crear)
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { title, image, description, previewVideo, preview_video, downloadUrl } = body;
      if (!title || !image || !description) {
        return json(400, { error: "Missing fields" });
      }
      const pv = previewVideo ?? preview_video ?? null;

      const rows =
        await sql`INSERT INTO posts (title, image, description, preview_video, download_url)
                  VALUES (${title}, ${image}, ${description}, ${pv}, ${downloadUrl || null})
                  RETURNING id`;

      return json(200, { ok: true, id: rows[0].id });
    }

    // ---------- PUT/PATCH /posts/:id (editar)
    if (event.httpMethod === "PUT" || event.httpMethod === "PATCH") {
      const id = getIdFromPath(event.path);
      if (!id) return json(400, { error: "Missing id" });

      const body = JSON.parse(event.body || "{}");

      const curRows =
        await sql`SELECT id, title, image, description, preview_video, download_url
                  FROM posts WHERE id = ${id} LIMIT 1`;
      if (!curRows.length) return json(404, { error: "Not found" });
      const cur = curRows[0];

      const merged = {
        title:         Object.prototype.hasOwnProperty.call(body, "title")        ? body.title        : cur.title,
        image:         Object.prototype.hasOwnProperty.call(body, "image")        ? body.image        : cur.image,
        description:   Object.prototype.hasOwnProperty.call(body, "description")  ? body.description  : cur.description,
        preview_video: Object.prototype.hasOwnProperty.call(body, "previewVideo")
                        ? body.previewVideo
                        : (Object.prototype.hasOwnProperty.call(body, "preview_video") ? body.preview_video : cur.preview_video),
        download_url:  Object.prototype.hasOwnProperty.call(body, "downloadUrl")  ? body.downloadUrl  : cur.download_url,
      };

      await sql`UPDATE posts
                SET title=${merged.title},
                    image=${merged.image},
                    description=${merged.description},
                    preview_video=${merged.preview_video},
                    download_url=${merged.download_url}
                WHERE id=${id}`;

      return json(200, { ok: true, id });
    }

    // ---------- DELETE /posts/:id
    if (event.httpMethod === "DELETE") {
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
