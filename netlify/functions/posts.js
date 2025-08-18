// netlify/functions/posts.js
import { neon } from '@neondatabase/serverless';

function getDbUrl() {
  const raw =
    process.env.DATABASE_URL ||
    process.env.NETLIFY_DATABASE_URL ||
    process.env.NETLIFY_DATABASE_URL_UNPOOLED ||
    '';
  // Limpia prefijos de Neon UI: psql 'postgresql://...'
  const cleaned = raw
    .replace(/^psql\s+['"]?/, '')
    .replace(/['"]?$/, '');
  if (!/^postgres(ql)?:\/\//.test(cleaned)) {
    throw new Error('Bad or missing DATABASE_URL');
  }
  return cleaned;
}

const sql = neon(getDbUrl()); // <- usa "sql" en el resto del handler


import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

// Respuestas comunes
const json = (status, data, extraHeaders = {}) => ({
  statusCode: status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  },
  body: JSON.stringify(data),
});

const requireAuth = (event) => {
  const auth = event.headers?.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  return token && token === process.env.AUTH_TOKEN;
};

export async function handler(event) {
  try {
    const { httpMethod: method, path } = event;

    // --- GET /posts  (lista)
    if (method === 'GET') {
      const rows = await sql`
        SELECT id, title, image, description, preview_video, download_url, details_url, created_at
        FROM posts
        ORDER BY created_at DESC
      `;
      return json(200, rows);
    }

    // --- POST /posts  (crear)
    if (method === 'POST') {
      if (!requireAuth(event)) return json(401, { error: 'Unauthorized' });
      const body = JSON.parse(event.body || '{}');

      // Validación mínima
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

    // --- DELETE /posts/:id (simple routing por path)
    if (method === 'DELETE') {
      if (!requireAuth(event)) return json(401, { error: 'Unauthorized' });
      const parts = path.split('/');
      const id = parts[parts.length - 1];
      if (!id || id.length < 10) return json(400, { error: 'id inválido' });

      await sql`DELETE FROM posts WHERE id = ${id}`;
      return json(200, { ok: true });
    }

    // Opcional: CORS preflight si algún día llamas desde otro origen
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
  } catch (err) {
    console.error(err);
    return json(500, { error: 'Internal Server Error' });
  }
}

