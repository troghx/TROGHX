import { neon, neonConfig } from "@neondatabase/serverless";
import { json as baseJson } from "./utils.js";

neonConfig.fetchConnectionCache = true;

const DB_URL =
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL_UNPOOLED;

const sql = DB_URL ? neon(DB_URL) : null;
let schemaReady = false;

const TOKEN = (process.env.GOFILE_API_TOKEN || "").trim();

const json = (status, data, extra = {}) =>
  baseJson(status, data, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...extra,
  });

async function ensureSchema() {
  if (!sql) return;
  await sql`CREATE TABLE IF NOT EXISTS downloads (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id    text,
    name       text,
    ip         text,
    created_at timestamptz DEFAULT now()
  )`;
}

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch failed: ${r.status}`);
  return r.json();
}

export async function handler(event) {
  try {
    if (event.httpMethod === "OPTIONS") return json(204, {});
    if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });
    if (!TOKEN) return json(500, { error: "GOFILE_API_TOKEN missing" });

    const p = event.queryStringParameters || {};

    // ---- LIST FOLDER ----
    if (p.list) {
      const folder = String(p.list).trim();
      try {
        const data = await fetchJson(`https://api.gofile.io/getContent?token=${TOKEN}&contentId=${encodeURIComponent(folder)}`);
        const contents = data?.data?.contents || {};
        const files = Object.values(contents)
          .filter((c) => c && c.type === "file")
          .map((c) => ({ id: c.id, name: c.name, link: c.link || c.directLink }));
        return json(200, { files });
      } catch (err) {
        console.error("[gofile list]", err);
        return json(500, { error: "list failed", detail: String(err.message || err) });
      }
    }

    // ---- HISTORY ----
    if (p.history) {
      try {
        if (!sql) return json(200, { downloads: [] });
        if (!schemaReady) {
          await ensureSchema();
          schemaReady = true;
        }
        const rows = await sql`SELECT file_id AS id, name, created_at FROM downloads ORDER BY created_at DESC LIMIT 50`;
        return json(200, { downloads: rows });
      } catch (err) {
        console.error("[gofile history]", err);
        return json(500, { error: "history failed", detail: String(err.message || err) });
      }
    }

    // ---- GET DIRECT LINK ----
    if (p.id) {
      const fileId = String(p.id).trim();
      let url = null;
      let name = null;
      try {
        // attempt via getContent
        try {
          const data = await fetchJson(`https://api.gofile.io/getContent?token=${TOKEN}&contentId=${encodeURIComponent(fileId)}`);
          const contents = data?.data?.contents || {};
          const item = contents[fileId] || Object.values(contents)[0];
          if (item) {
            url = item.directLink || item.link;
            name = item.name || null;
          }
        } catch (err) {
          /* ignore and fallback */
        }
        // fallback via getUpload
        if (!url) {
          try {
            const data = await fetchJson(`https://api.gofile.io/getUpload?token=${TOKEN}&contentId=${encodeURIComponent(fileId)}`);
            url = data?.data?.directLink || data?.data?.downloadPage || data?.data?.link || null;
            name = name || data?.data?.name || null;
          } catch (err) {
            /* ignore */
          }
        }
        if (!url) return json(404, { error: "not found" });

        // record download
        if (sql) {
          if (!schemaReady) {
            await ensureSchema();
            schemaReady = true;
          }
          const ip =
            event.headers?.["x-forwarded-for"]?.split(",")[0].trim() ||
            event.headers?.["client-ip"] ||
            null;
          await sql`INSERT INTO downloads (file_id, name, ip) VALUES (${fileId}, ${name}, ${ip})`;
        }
        return json(200, { url });
      } catch (err) {
        console.error("[gofile id]", err);
        return json(500, { error: "download failed", detail: String(err.message || err) });
      }
    }

    return json(400, { error: "bad request" });
  } catch (err) {
    console.error("[gofile] fatal", err);
    return json(500, { error: "Internal Server Error", detail: String(err.message || err) });
  }
}
