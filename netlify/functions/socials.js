// netlify/functions/socials.js
import { neon } from '@neondatabase/serverless';

const json = (s, d, h={}) => ({
  statusCode: s,
  headers: {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store', ...h},
  body: JSON.stringify(d),
});

function getDbUrl() {
  const raw = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || process.env.NETLIFY_DATABASE_URL_UNPOOLED || '';
  const cleaned = raw.replace(/^psql\s+['"]?/, '').replace(/['"]?$/, '').trim();
  if (!/^postgres(ql)?:\/\//.test(cleaned)) throw new Error('Missing/invalid DATABASE_URL');
  return cleaned;
}
const ok = d => json(200, d);
const fail = e => { console.error('[socials.fn]', e); return json(500, { error: e.message || 'Internal Server Error' }); };
const authed = (e) => (e.headers?.authorization||'').replace(/^Bearer\s+/i,'').trim() === (process.env.AUTH_TOKEN||'');

export async function handler(event){
  try{
    const { httpMethod:m, path, queryStringParameters } = event;
    const sql = neon(getDbUrl());

    // healthcheck opcional
    if (m==='GET' && queryStringParameters?.health==='1'){
      const [{ok:ping}] = await sql`select 1 as ok`;
      return ok({ ping });
    }

    if (m==='GET'){
      const rows = await sql`SELECT id,name,image,url,created_at FROM socials ORDER BY created_at DESC`;
      return ok(rows);
    }

    if (m==='POST'){
      if (!authed(event)) return json(401,{error:'Unauthorized'});
      const b = JSON.parse(event.body||'{}');
      if (!b.image || !b.url) return json(400,{error:'image y url son obligatorios'});
      const id = crypto.randomUUID();
      await sql`INSERT INTO socials (id,name,image,url) VALUES (${id}, ${b.name||null}, ${b.image}, ${b.url})`;
      return json(201,{ok:true,id});
    }

    if (m==='DELETE'){
      if (!authed(event)) return json(401,{error:'Unauthorized'});
      const id = path.split('/').pop();
      if (!id || id.length<10) return json(400,{error:'id inválido'});
      await sql`DELETE FROM socials WHERE id=${id}`;
      return ok({ok:true});
    }

    if (m==='OPTIONS'){
      return {statusCode:204, headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization'}, body:''};
    }

    return json(405,{error:'Method Not Allowed'});
  }catch(e){ return fail(e); }
}
