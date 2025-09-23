#!/usr/bin/env node
import { neon } from "@neondatabase/serverless";

const DB_URL =
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL_UNPOOLED;

if (!DB_URL) {
  console.error("DATABASE_URL (or NETLIFY_DATABASE_URL[_UNPOOLED]) is required");
  process.exit(1);
}

const fallback = String(process.argv[2] ?? "")
  .trim()
  .toLowerCase();

if (!fallback) {
  console.error("Usage: node scripts/backfill-player-mode.mjs <player-mode>");
  process.exit(1);
}

try {
  const sql = neon(DB_URL);
  const rows = await sql`
    UPDATE posts
    SET player_mode = ${fallback}
    WHERE player_mode IS NULL OR player_mode = ''
    RETURNING id
  `;
  console.log(`Updated ${rows.length} row(s) with player_mode='${fallback}'`);
} catch (err) {
  console.error("Failed to backfill player_mode", err);
  process.exitCode = 1;
}