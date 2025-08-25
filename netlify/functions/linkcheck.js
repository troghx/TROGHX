// netlify/functions/linkcheck.js
// Checa el estado de un enlace (HEAD con fallback GET de 1 byte) para evitar CORS desde el cliente.

import { json as baseJson } from "./utils.js";

const json = (s, d, extra = {}) =>
  baseJson(s, d, {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
    ...extra,
  });

export async function handler(event) {
  try {
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
        body: "",
      };
    }

    let url = "";
    if (event.httpMethod === "GET") {
      url = (event.queryStringParameters?.url || "").trim();
    } else if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      url = (body.url || "").trim();
    }
    if (!url) return json(400, { error: "Missing url" });
    if (!/^https?:\/\//i.test(url)) return json(400, { error: "Invalid URL scheme" });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    let status = null, ok = false;

    // 1) HEAD
    try {
      const r = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal });
      status = r.status; ok = r.ok;
    } catch (_) {}

    // 2) fallback GET con Range para 1 byte (muchos hosts bloquean HEAD)
    if (status === null) {
      try {
        const r2 = await fetch(url, {
          method: "GET",
          headers: { Range: "bytes=0-1" },
          redirect: "follow",
          signal: controller.signal,
        });
        status = r2.status; ok = r2.ok || (status >= 200 && status < 400);
      } catch (_) {}
    }

    clearTimeout(timeout);
    if (status === null) return json(200, { url, ok: false, status: null, note: "timeout or blocked" });
    return json(200, { url, ok, status });
  } catch (e) {
    console.error("[linkcheck]", e);
    return json(500, { error: "Internal Server Error" });
  }
}
