// netlify/functions/admin.js
import { neon } from "@neondatabase/serverless";
import crypto from "crypto";

const DB_URL =
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL_UNPOOLED;

const sql = DB_URL ? neon(DB_URL) : null;

const send = (code, data, extra = {}) => ({
  statusCode: code,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    ...extra,
  },
  body: JSON.stringify(data),
});

const sha256 = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");

async function ensureSchema() {
  await sql`CREATE TABLE IF NOT EXISTS admin_keys (
    id BIGSERIAL PRIMARY KEY,
    label TEXT,
    key_hash TEXT NOT NULL UNIQUE,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_admin_keys_revoked ON admin_keys (revoked)`;
}

function pathSeg(path) {
  const parts = String(path).split("/").filter(Boolean);
  const i = parts.lastIndexOf("admin");
  return parts.slice(i + 1); // e.g. ["keys","123"] or ["verify-key"]
}

function requireAuth(envToken, reqAuthHeader) {
  const tok = (reqAuthHeader || "").replace(/^Bearer\s+/i, "").trim();
  return envToken && tok && tok === envToken;
}

export async function handler(event) {
  try {
    if (event.httpMethod === "OPTIONS") return send(204, {});
    if (!sql) return send(500, { error: "DB not configured" });

    await ensureSchema();

    const seg = pathSeg(event.path);
    const envToken = process.env.AUTH_TOKEN || "";

    // POST /admin/verify-key   { key }
    if (event.httpMethod === "POST" && seg[0] === "verify-key") {
      const body = JSON.parse(event.body || "{}");
      const key = (body.key || "").trim();
      if (!key) return send(400, { ok: false, error: "Missing key" });

      const h = sha256(key);
      const rows = await sql`SELECT id, label, revoked FROM admin_keys WHERE key_hash = ${h} LIMIT 1`;
      if (!rows.length) return send(200, { ok: false, reason: "invalid" });
      if (rows[0].revoked) return send(200, { ok: false, reason: "revoked" });

      // ok: NO creamos sesión; sólo confirmamos que la llave es válida
      return send(200, { ok: true, keyId: rows[0].id, label: rows[0].label || null });
    }

    // A partir de aquí, cualquier gestión de llaves requiere AUTH_TOKEN
    if (!requireAuth(envToken, event.headers?.authorization)) {
      return send(401, { error: "Unauthorized" });
    }

    // GET /admin/keys
    if (event.httpMethod === "GET" && seg[0] === "keys") {
      const rows = await sql`SELECT id, label, revoked, created_at FROM admin_keys ORDER BY created_at DESC`;
      return send(200, rows);
    }

    // POST /admin/keys    { label? }  => genera y devuelve la clave en claro UNA sola vez
    if (event.httpMethod === "POST" && seg[0] === "keys") {
      const body = JSON.parse(event.body || "{}");
      const label = body.label ? String(body.label).slice(0, 120) : null;

      // Generamos una llave legible (32 chars base62)
      const raw = crypto.randomBytes(24).toString("base64url"); // ~32 chars
      const keyPlain = raw.replace(/[^a-zA-Z0-9]/g, "").slice(0, 32);
      const keyHash = sha256(keyPlain);

      await sql`INSERT INTO admin_keys (label, key_hash) VALUES (${label}, ${keyHash})`;
      return send(200, { ok: true, key: keyPlain });
    }

    // PUT /admin/keys/:id   { revoked: boolean }
    if (event.httpMethod === "PUT" && seg[0] === "keys" && seg[1]) {
      const id = seg[1];
      const body = JSON.parse(event.body || "{}");
      const revoked = !!body.revoked;
      const r =
        await sql`UPDATE admin_keys SET revoked = ${revoked} WHERE id = ${id} RETURNING id`;
      if (!r.length) return send(404, { error: "Not found" });
      return send(200, { ok: true });
    }

    // DELETE /admin/keys/:id
    if (event.httpMethod === "DELETE" && seg[0] === "keys" && seg[1]) {
      const id = seg[1];
      await sql`DELETE FROM admin_keys WHERE id = ${id}`;
      return send(200, { ok: true });
    }

    return send(404, { error: "Not found" });
  } catch (err) {
    console.error("[admin fn] error", err);
    return send(500, { error: "Internal Server Error" });
  }
}
