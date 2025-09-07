import { GoogleAuth } from "google-auth-library";
import { google } from "googleapis";
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

const CREDS = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
  : null;
const auth = CREDS
  ? new GoogleAuth({
      credentials: CREDS,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    })
  : null;
const drive = auth ? google.drive({ version: "v3", auth }) : null;

export async function handler(event) {
  try {
    if (event.httpMethod === "OPTIONS") return json(204, {});
    if (event.httpMethod !== "GET")
      return json(405, { error: "Method not allowed" });
    if (!auth || !drive)
      return json(500, { error: "GOOGLE_SERVICE_ACCOUNT_JSON missing" });

    const p = event.queryStringParameters || {};

    // ---- LIST FOLDER ----
    if (p.list) {
      const folderId = String(p.list).trim();
      try {
        const res = await drive.files.list({
          q: `'${folderId}' in parents and trashed=false`,
          fields: "files(id,name,size)",
        });
        const files = (res.data.files || []).map((f) => ({
          id: f.id,
          name: f.name,
          size: f.size,
        }));
        return json(200, { files });
      } catch (err) {
        console.error("[drive list]", err);
        return json(500, {
          error: "list failed",
          detail: String(err.message || err),
        });
      }
    }

        // ---- DOWNLOAD CHUNK ----
    if (p.dl) {
      const fileId = String(p.dl).trim();
      const start = parseInt(p.start || "0", 10);
      const end = p.end != null ? parseInt(p.end, 10) : undefined;
      try {
        const res = await drive.files.get(
          { fileId, alt: "media" },
          {
            headers: { Range: `bytes=${start}-${end}` },
            responseType: "stream",
          }
        );
        if (res.status !== 206)
          return json(res.status, { error: "download failed" });
        return new Response(res.data, {
          status: res.status,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/octet-stream",
            "Content-Length": res.headers["content-length"],
            "Content-Range": res.headers["content-range"],
            "Accept-Ranges": "bytes",
          },
        });
      } catch (err) {
        console.error("[drive dl]", err.message);
        return json(500, {
          error: "download failed",
          detail: err.message,
        });
      }
    }

    // ---- GET FILE META ----
    if (p.id) {
      const fileId = String(p.id).trim();
      try {
        const file = await drive.files.get({
          fileId,
          fields: "id,name,size",
        });
        const name = file.data?.name || null;
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

        const token = await auth.getAccessToken();
        return json(200, { size: file.data.size, token });
      } catch (err) {
        console.error("[drive id]", err);
        return json(500, {
          error: "download failed",
          detail: String(err.message || err),
        });
      }
    }

    return json(400, { error: "bad request" });
  } catch (err) {
    console.error("[drive] fatal", err);
    return json(500, {
      error: "Internal Server Error",
      detail: String(err.message || err),
    });
  }
}
