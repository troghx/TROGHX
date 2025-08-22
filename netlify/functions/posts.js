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
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    ...extraHeaders,
  },
  body: JSON.stringify(data),
});

function getIdFromPath(path = "") {
  const parts = String(path).split("/").filter(Boolean);
  const idx = parts.lastIndexOf("posts");
  if (idx === -1) return null;
  const id = parts[idx + 1];
  return id || null;
}

const CATS = new Set(["game", "app", "movie"]);
function normCat(c) {
  const v = String(c || "").toLowerCase().trim();
  return CATS.has(v) ? v : "game";
}

let schemaEnsured = false;
async function ensureSchema() {
  if (schemaEnsured) return;
  // Añade columna category si no existe e índice para ordenar por fecha dentro de la categoría
  await sql`ALTER TABLE IF EXISTS posts ADD COLUMN IF NOT EXISTS category text DEFAULT 'game'`;
  await sql`CREATE INDEX IF NOT EXISTS idx_posts_category_created ON posts (category, created_at DESC)`;
  schemaEnsured = true;
}

export async function handler(event) {
  try {
    if (event.httpMethod === "OPTIONS") {
      return json(204, {}, { "Cache-Control": "public, max-age=0, s-maxage=600" });
    }

    if (!sql) return json(500, { error: "DB not configured" });

    await ensureSchema();

    // ---- GET /posts or /posts/:id
    if (event.httpMethod === "GET") {
      const id = getIdFromPath(event.path);
      if (id) {
        const rows =
          await sql`SELECT id, title, image, description, preview_video, download_url, details_url, category, created_at
                    FROM posts WHERE id = ${id} LIMIT 1`;
        if (!rows.length) return json(404, { error: "Not found" });
        return json(200, rows[0], { "Cache-Control": "public, max-age=0, s-maxage=60" });
      }

      const qp = event.queryStringParameters || {};
      const lite  = qp.lite === "1" || qp.lite === "true";
      const limit = Math.min(Math.max(parseInt(qp.limit || "100", 10) || 100, 1), 500);
      const category = normCat(qp.category);

      if (lite) {
        const rows =
          await sql`SELECT id, title, category, created_at
                    FROM posts
                    WHERE category = ${category}
                    ORDER BY created_at DESC
                    LIMIT ${limit}`;
        return json(200, rows, { "Cache-Control": "public, max-age=0, s-maxage=30" });
      } else {
        const rows =
          await sql`SELECT id, title, image, description, preview_video, download_url, details_url, category, created_at
                    FROM posts
                    WHERE category = ${category}
                    ORDER BY created_at DESC
                    LIMIT ${limit}`;
        return json(200, rows, { "Cache-Control": "public, max-age=0, s-maxage=10" });
      }
    }

    // ---- POST /posts (create)
    if (event.httpMethod === "POST") {
      const auth = event.headers?.authorization || "";
      const token = auth.replace(/^Bearer\s+/i, "").trim();
      const envToken = process.env.AUTH_TOKEN || "";
      if (!envToken || token !== envToken) {
        return json(401, { error: "Unauthorized" });
      }

      const body = JSON.parse(event.body || "{}");
      const {
        title,
        image,
        description,
        previewVideo,
        preview_video,
        downloadUrl = null,
        detailsUrl  = null,
        category    = "game",
      } = body || {};

      if (!title || !image || !description) {
        return json(400, { error: "Missing fields" });
      }

      const cat = normCat(category);
      const pv = previewVideo ?? preview_video ?? null;

      const rows =
        await sql`INSERT INTO posts (title, image, description, preview_video, download_url, details_url, category)
                  VALUES (${title}, ${image}, ${description}, ${pv}, ${downloadUrl}, ${detailsUrl}, ${cat})
                  RETURNING id`;

      return json(200, { ok: true, id: rows[0].id });
    }

    // ---- PUT /posts/:id (update)
    if (event.httpMethod === "PUT") {
      const auth = event.headers?.authorization || "";
      const token = auth.replace(/^Bearer\s+/i, "").trim();
      const envToken = process.env.AUTH_TOKEN || "";
      if (!envToken || token !== envToken) {
        return json(401, { error: "Unauthorized" });
      }
      const id = getIdFromPath(event.path);
      if (!id) return json(400, { error: "Missing id" });

      const body = JSON.parse(event.body || "{}");
      const fields = {};
      ["title", "image", "description", "previewVideo", "preview_video", "downloadUrl", "detailsUrl", "category"].forEach((k) => {
        if (k in body && body[k] !== undefined) fields[k] = body[k];
      });

      if ("category" in fields) fields.category = normCat(fields.category);

      if (Object.keys(fields).length === 0) {
        return json(400, { error: "No fields to update" });
      }

      const pv = fields.previewVideo ?? fields.preview_video;

      const result =
        await sql`UPDATE posts
                  SET title = COALESCE(${fields.title}, title),
                      image = COALESCE(${fields.image}, image),
                      description = COALESCE(${fields.description}, description),
                      preview_video = COALESCE(${pv}, preview_video),
                      download_url = COALESCE(${fields.downloadUrl}, download_url),
                      details_url  = COALESCE(${fields.detailsUrl}, details_url),
                      category     = COALESCE(${fields.category}, category)
                  WHERE id = ${id}
                  RETURNING id`;

      if (!result.length) return json(404, { error: "Not found" });
      return json(200, { ok: true, id });
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
