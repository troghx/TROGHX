// netlify/functions/posts.js
import { neon, neonConfig } from "@neondatabase/serverless";

neonConfig.fetchConnectionCache = true;

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
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    ...extra,
  },
  body: JSON.stringify(data),
});

const cacheHdr = (sec = 60) => ({
  "Cache-Control": `public, max-age=${sec}, stale-while-revalidate=30`,
});

const CATS = new Set(["game", "app", "movie"]);
function normCat(v) {
  const s = String(v || "").toLowerCase().trim();
  if (CATS.has(s)) return s;
  // español → inglés
  if (s === "juego") return "game";
  if (s === "pelicula" || s === "película") return "movie";
  return "game";
}

const qs = (e) => e.queryStringParameters || {};

function getId(event) {
  const p = String(event.path || "");
  const parts = p.split("/").filter(Boolean);
  const i = parts.lastIndexOf("posts");
  let id = i >= 0 ? parts[i + 1] : null;
  if (!id) id = qs(event).id || null;
  if (!id) return null;
  id = String(id).replace(/\/+$/, "").trim();
  // UUID, alfanumérico con guiones >=10, o numérico
  const ok =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
    /^[A-Za-z0-9-]{10,}$/.test(id) ||
    /^\d+$/.test(id);
  return ok ? id : null;
}

function firstLinkFrom(html = "") {
  const m = String(html).match(/https?:\/\/[^\s"'<>]+/i);
  return m ? m[0] : null;
}

function auth(event) {
  const auth = event.headers?.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const env = (process.env.AUTH_TOKEN || "").trim();
  if (!env || token !== env) {
    return { ok: false, res: json(401, { error: "Unauthorized" }) };
  }
  return { ok: true };
}

async function ensureSchema() {
  // Crea tabla si no existe (uuid); si ya existe, no la toca.
  await sql`CREATE TABLE IF NOT EXISTS posts (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title          TEXT NOT NULL,
    description    TEXT,
    image          TEXT,
    image_thumb    TEXT,
    preview_video  TEXT,
    category       TEXT DEFAULT 'game',
    first_link     TEXT,
    link_ok        BOOLEAN,
    created_at     TIMESTAMPTZ DEFAULT now()
  )`;

  // Añade columnas que falten (seguras si ya existen)
  await sql`ALTER TABLE IF EXISTS posts
    ADD COLUMN IF NOT EXISTS image_thumb TEXT,
    ADD COLUMN IF NOT EXISTS preview_video TEXT,
    ADD COLUMN IF NOT EXISTS first_link TEXT,
    ADD COLUMN IF NOT EXISTS link_ok BOOLEAN,
    ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'game',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()`;

  await sql`CREATE INDEX IF NOT EXISTS idx_posts_cat_created ON posts (category, created_at DESC)`;
}

export async function handler(event) {
  try {
    if (event.httpMethod === "OPTIONS") return json(204, {}, cacheHdr(300));
    if (!sql) return json(500, { error: "DB not configured" });

    await ensureSchema();

    // LIST
    if (event.httpMethod === "GET" && event.path.endsWith("/posts")) {
      try {
        const p = qs(event);
        const limit = Math.min(Math.max(parseInt(p.limit || "200", 10) || 200, 1), 200);
        const lite = p.lite === "1" || p.lite === "true";
        const category = normCat(p.category);

        if (lite) {
          const rows = await sql`
            SELECT id, title, category,
                   COALESCE(image_thumb, image) AS image_thumb,
                   created_at, link_ok, first_link
            FROM posts
            WHERE category = ${category}
            ORDER BY created_at DESC
            LIMIT ${limit}
          `;
          return json(200, rows, cacheHdr(60));
        } else {
          const rows = await sql`
            SELECT id, title, category, image, description, preview_video,
                   created_at, link_ok, first_link
            FROM posts
            WHERE category = ${category}
            ORDER BY created_at DESC
            LIMIT ${limit}
          `;
          return json(200, rows, cacheHdr(20));
        }
      } catch (err) {
        console.error("[GET /posts]", err);
        return json(500, { error: "List failed", detail: String(err.message || err) });
      }
    }

    // DETAIL o VIDEO
    if (event.httpMethod === "GET" && event.path.includes("/posts/")) {
      const id = getId(event);
      if (!id) return json(400, { error: "invalid id" });

      try {
        const p = qs(event);
        if (p.video === "1") {
          const rows = await sql`SELECT preview_video FROM posts WHERE id=${id} LIMIT 1`;
          if (!rows.length) return json(404, { error: "not found" });
          return json(200, { previewVideo: rows[0].preview_video || null }, cacheHdr(300));
        }
        const rows = await sql`
          SELECT id, title, category, image, description, created_at, link_ok, first_link
          FROM posts WHERE id=${id} LIMIT 1
        `;
        if (!rows.length) return json(404, { error: "not found" });
        return json(200, rows[0], cacheHdr(60));
      } catch (err) {
        console.error("[GET /posts/:id]", err);
        return json(500, { error: "Detail failed", detail: String(err.message || err) });
      }
    }

    // CREATE
    if (event.httpMethod === "POST" && event.path.endsWith("/posts")) {
      const g = auth(event);
      if (!g.ok) return g.res;

      try {
        const b = JSON.parse(event.body || "{}");
        const title        = (b.title || "").trim();
        const category     = normCat(b.category);
        const image        = b.image || null;
        const image_thumb  = b.image_thumb || b.imageThumb || b.image || null;
        const description  = b.description || null;
        const previewVideo = b.previewVideo || b.preview_video || null;
        const first_link   = b.first_link || firstLinkFrom(description) || null;
        const link_ok      = (typeof b.link_ok === "boolean") ? b.link_ok : null;

        if (!title || !image || !image_thumb || !description) {
          return json(400, { error: "missing fields" });
        }

        const rows = await sql`
          INSERT INTO posts (title, category, image, image_thumb, description, preview_video, link_ok, first_link)
          VALUES (${title}, ${category}, ${image}, ${image_thumb}, ${description}, ${previewVideo}, ${link_ok}, ${first_link})
          RETURNING id
        `;
        return json(200, { id: rows[0].id });
      } catch (err) {
        console.error("[POST /posts]", err);
        return json(500, { error: "Insert failed", detail: String(err.message || err) });
      }
    }

    // UPDATE
    if (event.httpMethod === "PUT" && event.path.includes("/posts/")) {
      const g = auth(event);
      if (!g.ok) return g.res;

      const id = getId(event);
      if (!id) return json(400, { error: "invalid id" });

      try {
        const b = JSON.parse(event.body || "{}");
        const sets = [];
        if ("title"        in b) sets.push(sql`title = ${(b.title || "").trim()}`);
        if ("category"     in b) sets.push(sql`category = ${normCat(b.category)}`);
        if ("description"  in b) {
          sets.push(sql`description = ${b.description ?? null}`);
          if (!("first_link" in b)) {
            const fl = firstLinkFrom(b.description || "");
            sets.push(sql`first_link = ${fl || null}`);
          }
        }
        if ("image"        in b) sets.push(sql`image = ${b.image ?? null}`);
        if ("image_thumb"  in b || "imageThumb" in b)
          sets.push(sql`image_thumb = ${b.image_thumb ?? b.imageThumb ?? null}`);
        if ("previewVideo" in b || "preview_video" in b)
          sets.push(sql`preview_video = ${b.previewVideo ?? b.preview_video ?? null}`);
        if ("link_ok"      in b)
          sets.push(sql`link_ok = ${(typeof b.link_ok === "boolean") ? b.link_ok : null}`);
        if ("first_link"   in b) sets.push(sql`first_link = ${b.first_link ?? null}`);

        if (!sets.length) return json(400, { error: "no fields to update" });

        await sql`UPDATE posts SET ${sql.join(sets, sql`, `)} WHERE id=${id}`;
        return json(200, { ok: true });
      } catch (err) {
        console.error("[PUT /posts/:id]", err);
        return json(500, { error: "Update failed", detail: String(err.message || err) });
      }
    }

    // DELETE
    if (event.httpMethod === "DELETE" && event.path.includes("/posts/")) {
      const g = auth(event);
      if (!g.ok) return g.res;

      const id = getId(event);
      if (!id) return json(400, { error: "invalid id" });

      try {
        await sql`DELETE FROM posts WHERE id=${id}`;
        return json(200, { ok: true });
      } catch (err) {
        console.error("[DELETE /posts/:id]", err);
        return json(500, { error: "Delete failed", detail: String(err.message || err) });
      }
    }

    return json(404, { error: "Not found" });
  } catch (err) {
    console.error("[posts] fatal", err);
    return json(500, { error: "Internal Server Error", detail: String(err.message || err) });
  }
}
