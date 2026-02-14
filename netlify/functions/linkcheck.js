// netlify/functions/linkcheck.js
// Checa el estado de un enlace (HEAD con fallback GET de 1 byte) para evitar CORS desde el cliente.

import { isIP } from "node:net";
import { json as baseJson } from "./utils.js";

const json = (s, d, extra = {}) =>
  baseJson(s, d, {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
    ...extra,
  });

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "host.docker.internal",
  "169.254.169.254",
  "metadata.google.internal",
]);

function isPrivateIpv4(host) {
  const parts = host.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function hasForbiddenHost(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return true;
  }
  if (!/^https?:$/i.test(parsed.protocol)) return true;

  const hostname = (parsed.hostname || "").toLowerCase().trim();
  if (!hostname) return true;
  if (BLOCKED_HOSTS.has(hostname)) return true;
  if (hostname.endsWith(".local") || hostname.endsWith(".internal")) return true;

  const ipType = isIP(hostname);
  if (ipType === 4 && isPrivateIpv4(hostname)) return true;
  if (ipType === 6 && (hostname === "::1" || hostname.startsWith("fe80:") || hostname.startsWith("fc") || hostname.startsWith("fd"))) {
    return true;
  }
  return false;
}

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
    if (hasForbiddenHost(url)) return json(400, { error: "Forbidden host" });

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
