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

    // ---- DOWNLOAD RANGE (proxy; no expone token) ----
    if (p.id && p.range) {
      const fileId = String(p.id).trim();
      const range = String(p.range).trim();
      const m = range.match(/^(\d+)-(\d+)$/);
      if (!m) return json(400, { error: "invalid range" });
      const start = Number(m[1]);
      const end = Number(m[2]);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start) {
        return json(400, { error: "invalid range" });
      }
      const span = end - start + 1;
      if (span > 16 * 1024 * 1024) {
        return json(400, { error: "range too large" });
      }

      try {
        const response = await drive.files.get(
          { fileId, alt: "media" },
          {
            responseType: "arraybuffer",
            headers: { Range: `bytes=${start}-${end}` },
          }
        );

        const payload = Buffer.from(response?.data || "");
        const sourceHeaders = response?.headers || {};
        const statusCode = Number(response?.status) || 206;
        const headers = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Content-Type": sourceHeaders["content-type"] || "application/octet-stream",
          "Cache-Control": "no-store",
        };
        if (sourceHeaders["content-range"]) headers["Content-Range"] = sourceHeaders["content-range"];
        if (sourceHeaders["content-length"]) headers["Content-Length"] = sourceHeaders["content-length"];
        if (sourceHeaders["accept-ranges"]) headers["Accept-Ranges"] = sourceHeaders["accept-ranges"];

        return {
          statusCode,
          headers,
          body: payload.toString("base64"),
          isBase64Encoded: true,
        };
      } catch (err) {
        console.error("[drive range]", err);
        return json(500, {
          error: "range failed",
          detail: String(err.message || err),
        });
      }
    }

    // ---- GET FILE META ----
    if (p.id) {
      const fileId = String(p.id).trim();
      try {
        const file = await drive.files.get({
          fileId,
          fields: "id,name,size,mimeType",
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
        return json(200, {
          name: file.data.name,
          size: file.data.size,
          mimeType: file.data.mimeType,
        });
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
