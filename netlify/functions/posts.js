// netlify/functions/posts.js
import { neon } from '@neondatabase/serverless';

const json = (status, data, extra = {}) => ({
  statusCode: status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extra,
  },
  body: JSON.stringify(data),
});

// Lee y limpia la DATABASE_URL (soporta variables creadas por Neon en Netlify)
function getDbUrl() {
  const raw =
    process.env.DATABASE_URL ||
    process.env.NETLIFY_DATABASE_URL ||
    process.env.NETLIFY_DATABASE_URL_UNPOOLED ||
    '';
  const cleaned = raw
    .replace(/^psql\s+['"]?/, '') // quita "psql '"
    .replace(/['"]?$/, '')        // quita la comilla final
    .trim();
  if (!/^postgres(ql)?:\/\//.test(cleaned)) {
    throw new Error('Missing/invalid DATABASE_URL');
  }
  return cleaned;
}

function getSql() {
  const url = getDbUrl();
  return neon(url);
}

const ok = (d) => json(200, d);
const err = (e) => {
  console.error('[posts.fn] ', e);
  // exponemos el mensaje para depurar (quítalo cuando acabes)
  const message = (e && (e.message || e.errorMessage)) || 'Internal Server Error';
  return json(500, { error: message });
};

function authed(event) {
  const hdr = event.headers?.authorization || '';
  const token = hdr.replace(/^Bearer\s+/i, '').trim();
  return token && token === (process.env.AUTH_TOKEN || '');
}

export async function handler(event) {
  try {
    const { httpMethod: method, path, queryStringParameters } = event;
    const sql = getSql();

    // Healthcheck: /posts?health=1
    if (method === 'GET' && queryStringParameters?.health === '1') {
      const url = getDbUrl();
      // prueba de conexión
      const [{ ok: ping }] = await sql`select 1 as ok`;
      return ok({
        ping,
        env_seen: {
          DATABASE_URL: !!process.env.DATABASE_URL,
          NETLIFY_DATABASE_URL: !!process.env.NETLIFY_DATABASE_URL,
          NETLIFY_DATABASE_URL_UNPOOLED: !!process.env.NETLIFY_DATABASE_URL_UNPOOLED,
        },
        url_len: url.length,
      });
    }

    if (method === 'GET') {
      const rows = await sql`
        SELECT id, title, image, description, preview_video, download_url, details_url, created_at
        FROM posts
        ORDER BY created_at DESC
      `;
      return ok(rows);
    }

    if (method === 'POST') {
      if (!authed(event)) return json(401, { error: 'Unauthorized' });
      const body = JSON.parse(event.body || '{}');

      if (!body.title || !body.image || !body.description) {
        return json(400, { error: 'title, image y description son obligatorios' });
      }

      const id = crypto.randomUUID();
      await sql`
        INSERT INTO posts (id, title, image, description, preview_video, download_url, details_url)
        VALUES (${id}, ${body.title}, ${body.image}, ${body.description},
                ${body.previewVideo || null}, ${body.downloadUrl || null}, ${body.detailsUrl || null})
      `;
      return json(201, { ok: true, id });
    }

    if (method === 'DELETE') {
      if (!authed(event)) return json(401, { error: 'Unauthorized' });
      const id = path.split('/').pop();
      if (!id || id.length < 10) return json(400, { error: 'id inválido' });
      await sql`DELETE FROM posts WHERE id = ${id}`;
      return ok({ ok: true });
    }

    if (method === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
        body: '',
      };
    }

    return json(405, { error: 'Method Not Allowed' });
  } catch (e) {
    return err(e);
  }
}
