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

    // ---- GET DIRECT LINK ----
    if (p.id) {
      const fileId = String(p.id).trim();
      try {
        const file = await drive.files.get({
          fileId,
          fields: "id,name,size",
        });
        const name = file.data?.name || null;
        const token = await auth.getAccessToken();
        if (!token) return json(500, { error: "auth failed" });
        const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&access_token=${encodeURIComponent(
          token
        )}`;

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

        return json(200, { url, size: file.data.size });
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
