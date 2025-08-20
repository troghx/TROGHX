// netlify/functions/posts.js
import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";

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

async function inferIdType() {
  try {
    const rows = await sql`
      SELECT data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'id'
      LIMIT 1
    `;
    if (!rows.length) return { kind: "unknown" };
    const { data_type, udt_name } = rows[0];
    if (data_type === "uuid" || udt_name === "uuid") return { kind: "uuid" };
    const numTypes = new Set(["integer", "bigint", "smallint", "numeric"]);
    if (numTypes.has(data_type) || numTypes.has(udt_name)) return { kind: "number" };
    return { kind: "unknown" };
  } catch {
    return { kind: "unknown" };
  }
}

function parseFeaturedRank(input) {
  if (input === undefined || input === null || input === "") return null;
  const n = parseInt(input, 10);
  if (!Number.isFinite(n)) return null;
  // acota de 1 a 5 (o sube si quieres más)
  if (n < 1 || n > 5) return null;
  return n;
}

export async function handler(event) {
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

  try {
    if (!sql) return json(500, { error: "DB not configured" });

    // ---------- GET /posts ó /posts/:id
    if (event.httpMethod === "GET") {
      const id = getIdFromPath(event.path);
      if (id) {
        const rows =
          await sql`SELECT id, title, image, description, preview_video, featured_rank, created_at
                    FROM posts WHERE id = ${id} LIMIT 1`;
        if (!rows.length) return json(404, { error: "Not found" });
        return json(200, rows[0]);
      }

      const qp = event.queryStringParameters || {};
      const lite = qp.lite === "1" || qp.lite === "true";
      const featuredOnly = qp.featured === "1" || qp.featured === "true";
      const limit = Math.min(Math.max(parseInt(qp.limit || "24", 10) || 24, 1), 100);

      if (featuredOnly) {
        const rows =
          await sql`SELECT id, title, image, description, preview_video, featured_rank, created_at
                    FROM posts
                    WHERE featured_rank IS NOT NULL
                    ORDER BY featured_rank ASC, created_at DESC
                    LIMIT ${limit}`;
        return json(200, rows);
      }

      if (lite) {
        const rows =
          await sql`SELECT id, title, image, description, featured_rank, created_at
                    FROM posts
                    ORDER BY created_at DESC
                    LIMIT ${limit}`;
        return json(200, rows);
      } else {
        const rows =
          await sql`SELECT id, title, image, description, preview_video, featured_rank, created_at
                    FROM posts
                    ORDER BY created_at DESC
                    LIMIT ${limit}`;
        return json(200, rows);
      }
    }

    // ---------- Auth
    const auth = event.headers?.authorization || "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    const envToken = process.env.AUTH_TOKEN || "";
    if (!envToken || token !== envToken) {
      return json(401, { error: "Unauthorized" });
    }

    // ---------- POST /posts (crear)
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { title, image, description, previewVideo, preview_video, featured_rank } = body;
      if (!title || !image || !description) {
        return json(400, { error: "Missing fields" });
      }
      const pv = previewVideo ?? preview_video ?? null;
      const fr = parseFeaturedRank(featured_rank);

      try {
        const rows =
          await sql`INSERT INTO posts (title, image, description, preview_video, featured_rank)
                    VALUES (${title}, ${image}, ${description}, ${pv}, ${fr})
                    RETURNING id`;
        return json(200, { ok: true, id: rows[0].id });
      } catch (e) {
        const msg = String(e?.message || e || "");
        if (/null value in column "id".*violates not-null constraint/i.test(msg)) {
          try {
            const idType = await inferIdType();
            if (idType.kind === "uuid") {
              const newId = randomUUID();
              const rows2 =
                await sql`INSERT INTO posts (id, title, image, description, preview_video, featured_rank)
                          VALUES (${newId}, ${title}, ${image}, ${description}, ${pv}, ${fr})
                          RETURNING id`;
              return json(200, { ok: true, id: rows2[0].id });
            } else {
              const seq =
                await sql`SELECT COALESCE(MAX(id),0)+1 AS next_id FROM posts`;
              const newId = seq?.[0]?.next_id || 1;
              const rows2 =
                await sql`INSERT INTO posts (id, title, image, description, preview_video, featured_rank)
                          VALUES (${newId}, ${title}, ${image}, ${description}, ${pv}, ${fr})
                          RETURNING id`;
              return json(200, { ok: true, id: rows2[0].id });
            }
          } catch (e2) {
            return json(500, { error: "Insert retry failed", hint: String(e2?.message || e2) });
          }
        }
        return json(500, { error: "Insert failed", hint: msg });
      }
    }

    // ---------- PUT/PATCH /posts/:id (editar)
    if (event.httpMethod === "PUT" || event.httpMethod === "PATCH") {
      const id = getIdFromPath(event.path);
      if (!id) return json(400, { error: "Missing id" });

      const body = JSON.parse(event.body || "{}");

      const curRows =
        await sql`SELECT id, title, image, description, preview_video, featured_rank
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
        featured_rank: Object.prototype.hasOwnProperty.call(body, "featured_rank")
                        ? parseFeaturedRank(body.featured_rank)
                        : cur.featured_rank,
      };

      try {
        await sql`UPDATE posts
                  SET title=${merged.title},
                      image=${merged.image},
                      description=${merged.description},
                      preview_video=${merged.preview_video},
                      featured_rank=${merged.featured_rank}
                  WHERE id=${id}`;
        return json(200, { ok: true, id });
      } catch (e) {
        return json(500, { error: "Update failed", hint: String(e?.message || e) });
      }
    }

    // ---------- DELETE /posts/:id
    if (event.httpMethod === "DELETE") {
      const id = getIdFromPath(event.path);
      if (!id) return json(400, { error: "Missing id" });
      try {
        await sql`DELETE FROM posts WHERE id = ${id}`;
        return json(200, { ok: true });
      } catch (e) {
        return json(500, { error: "Delete failed", hint: String(e?.message || e) });
      }
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    return json(500, { error: "Internal Server Error", hint: String(err?.message || err) });
  }
}
