// netlify/functions/faq.js
import { neon } from '@neondatabase/serverless';
import { json as baseJson } from './utils.js';

const DB_URL = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || process.env.NETLIFY_DATABASE_URL_UNPOOLED;
const sql = DB_URL ? neon(DB_URL) : null;

const json = (status, data, extra = {}) =>
  baseJson(status, data, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    ...extra,
  });

let schemaReady = false;
async function ensureSchema(){
  await sql`CREATE TABLE IF NOT EXISTS faq (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT
  )`;
}

function sanitizeContent(value){
  let html = String(value || '');
  html = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '');
  html = html.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '');
  html = html.replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, '');
  return html;
}

function authed(event){
  const auth = event.headers?.authorization || '';
  const token = auth.replace(/^Bearer\s+/i,'').trim();
  const env = (process.env.AUTH_TOKEN || '').trim();
  return env && token === env;
}

export async function handler(event){
  try{
    if(event.httpMethod === 'OPTIONS') return json(204, {});
    if(!sql) return json(500, { error: 'DB not configured' });

    if(!schemaReady){ await ensureSchema(); schemaReady = true; }

    if(event.httpMethod === 'GET'){
      const rows = await sql`SELECT content FROM faq LIMIT 1`;
      const content = rows.length ? rows[0].content : '';
      return json(200, { content });
    }

    if(event.httpMethod === 'PUT'){
      if(!authed(event)) return json(401, { error: 'Unauthorized' });
      const body = JSON.parse(event.body || '{}');
      const content = sanitizeContent(body.content || '');
      const rows = await sql`SELECT id FROM faq LIMIT 1`;
      if(rows.length){
        await sql`UPDATE faq SET content=${content} WHERE id=${rows[0].id}`;
      }else{
        await sql`INSERT INTO faq (content) VALUES (${content})`;
      }
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method Not Allowed' });
  }catch(err){
    console.error('[faq]', err);
    return json(500, { error: 'Internal Server Error' });
  }
}
