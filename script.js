/* =========================
   TROGH — script.js (Lite grid + thumbs + video on-demand + link_ok)
   ========================= */

/* ------- Templates del HTML ------- */
const template = document.getElementById("tile-template");
const modalTemplate = document.getElementById("game-modal-template");
const adminLoginModalTemplate = document.getElementById("admin-login-modal-template");
const adminMenuModalTemplate = document.getElementById("admin-menu-modal-template");
const newGameModalTemplate = document.getElementById("new-game-modal-template");
const newSocialModalTemplate = document.getElementById("new-social-modal-template");
const dmcaModalTemplate = document.getElementById("dmca-modal-template");
const faqModalTemplate = document.getElementById("faq-modal-template");

initStarfield();

function initStarfield() {
  const canvas = document.getElementById("star-canvas");
  if (!canvas) return;

  const prefersReducedMotion =
    typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const state = {
    stars: [],
    width: 0,
    height: 0,
    pixelRatio: 1,
    centerX: 0,
    centerY: 0,
    maxOrbit: 0,
    lastTime: 0,
    animationId: 0
  };

  const ROTATION_BASE = 0.03;
  const ROTATION_VARIANCE = 0.045;

  function createStar() {
    const distanceRatio = Math.pow(Math.random(), 0.45);
    const depth = 0.35 + Math.random() * 0.65;
    return {
      angle: Math.random() * Math.PI * 2,
      distanceRatio,
      depth,
      baseSize: 0.6 + Math.random() * 1.4,
      baseAlpha: 0.45 + Math.random() * 0.4,
      pulseAmplitude: 0.15 + Math.random() * 0.25,
      pulseSpeed: 0.8 + Math.random() * 1.4,
      pulsePhase: Math.random() * Math.PI * 2,
      rotationFactor: 0.5 + Math.random() * 1.1
    };
  }

  function updateStarMetrics(star) {
    star.distance = star.distanceRatio * state.maxOrbit;
    star.radius = Math.max(0.35, star.baseSize * star.depth) * state.pixelRatio;
    const depthSpeed = 0.6 + star.depth * 0.4;
    star.angularVelocity = (ROTATION_BASE + ROTATION_VARIANCE * star.rotationFactor) * depthSpeed;
  }

  function adjustStarCount(target) {
    if (target > state.stars.length) {
      for (let i = state.stars.length; i < target; i += 1) {
        state.stars.push(createStar());
      }
    } else if (target < state.stars.length) {
      state.stars.length = target;
    }
  }

  function resize() {
    state.pixelRatio = Math.min(window.devicePixelRatio || 1, 2.2);
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    const displayWidth = Math.max(1, Math.floor(state.width * state.pixelRatio));
    const displayHeight = Math.max(1, Math.floor(state.height * state.pixelRatio));

    canvas.width = displayWidth;
    canvas.height = displayHeight;
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;

    state.centerX = displayWidth / 2;
    state.centerY = displayHeight / 2;
    state.maxOrbit = Math.hypot(displayWidth, displayHeight) / 2;

    const density = 0.000085;
    const target = Math.round(Math.min(360, Math.max(140, state.width * state.height * density)));
    adjustStarCount(target);
    state.stars.forEach(updateStarMetrics);
  }

  function paintStars(delta, advance = true) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (const star of state.stars) {
      if (advance) {
        star.angle += star.angularVelocity * delta;
        star.pulsePhase += star.pulseSpeed * delta;
      }

      const brightness = Math.min(
        1,
        Math.max(0, star.baseAlpha + Math.sin(star.pulsePhase) * star.pulseAmplitude)
      );
      const flicker = 1 + Math.sin(star.pulsePhase * 1.2) * 0.15;
      const radius = star.radius * flicker;
      const glowRadius = radius * (2.6 + star.depth * 0.7);

      const x = state.centerX + Math.cos(star.angle) * star.distance;
      const y = state.centerY + Math.sin(star.angle) * star.distance;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${0.85 * brightness})`);
      gradient.addColorStop(0.45, `rgba(136, 196, 255, ${0.4 * brightness})`);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function renderFrame(now) {
    if (!state.lastTime) {
      state.lastTime = now;
    }
    const delta = Math.min(0.05, (now - state.lastTime) / 1000);
    state.lastTime = now;
    paintStars(delta, true);
    state.animationId = requestAnimationFrame(renderFrame);
  }

  function startAnimation() {
    if (state.animationId) return;
    state.lastTime = 0;
    state.animationId = requestAnimationFrame(renderFrame);
  }

  function stopAnimation() {
    if (state.animationId) {
      cancelAnimationFrame(state.animationId);
      state.animationId = 0;
    }
  }

  resize();
  paintStars(0, false);
  canvas.style.opacity = "1";

  const shouldReduceMotion = prefersReducedMotion && prefersReducedMotion.matches;
  if (!shouldReduceMotion) {
    startAnimation();
  }

  window.addEventListener("resize", () => {
    resize();
    paintStars(0, false);
  });

  if (prefersReducedMotion) {
    const handler = (event) => {
      if (event.matches) {
        stopAnimation();
        paintStars(0, false);
        canvas.style.opacity = "1";
      } else {
        canvas.style.opacity = "1";
        resize();
        startAnimation();
      }
    };

    if (typeof prefersReducedMotion.addEventListener === "function") {
      prefersReducedMotion.addEventListener("change", handler);
    } else if (typeof prefersReducedMotion.addListener === "function") {
      prefersReducedMotion.addListener(handler);
    }
  }
}

const dmcaTexts = {
  es: `
    <p><strong>TROGH</strong> no aloja archivos ni juegos con derechos de autor. Este sitio solo muestra metadatos y <em>enlaces</em> hacia servicios de terceros que alojan los contenidos bajo sus propios términos.</p>

    <p>Si eres titular de derechos y consideras que un enlace publicado aquí apunta a material que infringe tus derechos, retiraremos los <em>enlaces</em> del sitio al recibir un <strong>Aviso DMCA válido</strong>.</p>

    <h4 style="margin-top:1rem">Cómo enviar un aviso de retirada (DMCA)</h4>
    <p>Para procesarlo, incluye lo siguiente:</p>
    <ol>
      <li>Identificación de la obra protegida (título, descripción y, si aplica, registro).</li>
      <li>URL(s) exacta(s) de <strong>TROGH GAMES</strong> donde aparece el/los enlace(s) a retirar.</li>
      <li>URL(s) de origen en el servicio de terceros (si las conoces).</li>
      <li>Datos de contacto: nombre, cargo (si actúas en representación), organización, país y correo electrónico.</li>
      <li>Declaración de buena fe de que el uso no está autorizado por el titular, su agente o la ley.</li>
      <li>Declaración, bajo protesta de decir verdad, de que la información es exacta y que estás autorizado a actuar en nombre del titular.</li>
      <li>Firma física o electrónica (nombre completo basta como firma electrónica).</li>
    </ol>

    <p>Envíanos tu aviso a través del <a href="/dmca.html" class="dmca-form-link">formulario DMCA</a> (recomendado) o por correo a <a href="mailto:troghx@gmail.com">troghx@gmail.com</a>.</p>

    <p class="muted" style="opacity:.8">Nota: si el archivo está alojado por un tercero (p. ej., MEGA, Google Drive, YouTube, etc.), también deberás contactar a ese servicio para la retirada del material en su plataforma.</p>

    <h4 style="margin-top:1rem">Contra-aviso</h4>
    <p>Si eres el publicador del enlace retirado y crees que hubo un error o cuentas con autorización, puedes enviar un <strong>contra-aviso</strong> con tus datos de contacto, la URL retirada y una declaración bajo protesta de decir verdad indicando que la retirada fue por error. Tras recibir un contra-aviso válido, podremos restituir el contenido salvo que el denunciante nos informe de acciones legales.</p>

    <h4 style="margin-top:1rem">Reincidencia</h4>
    <p>Podemos limitar publicaciones o accesos de usuarios/colaboradores que incurran reiteradamente en infracciones.</p>
  `,
  en: `
    <p><strong>TROGH</strong> does not host copyrighted files. We only display metadata and <em>links</em> to third-party services that host the content under their own terms.</p>

    <p>If you are a copyright owner and believe a link on our site points to infringing material, we will remove such <em>links</em> upon receiving a <strong>valid DMCA Notice</strong>.</p>

    <h4 style="margin-top:1rem">How to file a DMCA Notice</h4>
    <p>Please include:</p>
    <ol>
      <li>Identification of the copyrighted work (title, description, and registration if applicable).</li>
      <li>Exact <strong>TROGH GAMES</strong> URL(s) where the link(s) appear.</li>
      <li>Source hosting URL(s) on the third-party service (if known).</li>
      <li>Contact info: name, role (if acting on behalf), organization, country, and email.</li>
      <li>A good-faith statement that the use is not authorized by the owner, its agent, or the law.</li>
      <li>A statement under penalty of perjury that the notice is accurate and you are authorized to act on behalf of the owner.</li>
      <li>Your physical or electronic signature (full name is acceptable as an electronic signature).</li>
    </ol>

    <p>Send your notice via our <a href="/dmca.html" class="dmca-form-link">DMCA form</a> (recommended) or email <a href="mailto:troghx@gmail.com">troghx@gmail.com</a>.</p>

    <p class="muted" style="opacity:.8">Note: if the file is hosted by a third party (e.g., MEGA, Google Drive, YouTube, etc.), you should also contact that service to remove the file from their platform.</p>

    <h4 style="margin-top:1rem">Counter-Notice</h4>
    <p>If you are the publisher of a removed link and believe it was taken down in error or you are authorized, you may submit a <strong>counter-notice</strong> including your contact details, the removed URL, and a statement under penalty of perjury that the removal was in error. Upon a valid counter-notice, we may restore the content unless the claimant informs us of legal action.</p>

    <h4 style="margin-top:1rem">Repeat Infringement</h4>
    <p>We may limit postings or access for users/contributors who repeatedly infringe.</p>
  `
};

/* ------- LocalStorage keys ------- */
const LS_RECENTES   = "tgx_recientes";
const LS_ADMIN      = "tgx_is_admin";
const LS_ADMIN_HASH = "tgx_admin_hash";
const LS_ADMIN_SALT = "tgx_admin_salt";
const LS_ADMIN_USER = "tgx_admin_user";
const LS_SOCIALS    = "tgx_socials";
const LS_ADMIN_NOTIF = "tgx_admin_notifications_seen";

/* ------- Cache / límites ------- */
const POSTS_LIST_LIMIT = 120;
const POSTS_CACHE_TTL = 1000 * 60 * 5; // 5 minutos
const SOCIALS_CACHE_TTL = 1000 * 60 * 10; // 10 minutos

/* ------- Endpoints ------- */
const API_POSTS    = "/.netlify/functions/posts";
const API_SOC      = "/.netlify/functions/socials";
const API_LINK     = "/.netlify/functions/linkcheck";
const API_ADM      = "/.netlify/functions/admins";
const API_COMMENTS = "/.netlify/functions/comments";

/* ------- Estado ------- */
let isAdmin = false;
let recientes = [];
let socials  = [];
window.currentCategory = "game";
// Descargas en curso
const activeDownloads = window.activeDownloads || [];
window.activeDownloads = activeDownloads;
let downloadsExpanded = false;
const TOPBAR_LOGOS = {
  game: "assets/images/logotopbar.png",
  app: "assets/images/logotopbar.png",
  movie: "assets/images/logotopbar.png"
};
const CATEGORY_LABELS = {
  game: "Juego",
  app: "Aplicación",
  movie: "Película"
};
const PLAYER_MODE_ICONS = {
  single: "assets/images/player-modes/single.png",
  multi: "assets/images/player-modes/multi.png"
};
const PLAYER_MODE_LABELS = {
  single: "Un jugador",
  multi: "Multijugador"
};
const ADMIN_NOTIF_LIMIT = 40;
const ADMIN_NOTIF_POLL_INTERVAL = 45000;
function updateTopbarLogo(cat){
  const logoEl = document.querySelector('.topbar .logo');
  if(!logoEl) return;
  const src = TOPBAR_LOGOS[cat] || TOPBAR_LOGOS.game;
  logoEl.src = src;
  const altMap = {
    game: 'Logo de TROGH GAMES',
    app: 'Logo de TROGH APPS',
    movie: 'Logo de TROGH MOVIES'
  };
  logoEl.alt = altMap[cat] || altMap.game;
}
let PAGE_SIZE = 12;
let page = 1;
let searchQuery = "";
let recientesWheelCooldownTs = 0;
const fullCache = new Map();
const videoCache = new Map();
const postsCache = new Map();
const socialsCacheState = { ts: 0, data: [] };

function persistPostsCache(){
  if(typeof localStorage === "undefined") return;
  try {
    const payload = {
      version: 1,
      lastCategory: window.currentCategory || "game",
      entries: {}
    };
    postsCache.forEach((entry, key)=>{
      if(entry && Array.isArray(entry.data)){
        payload.entries[key] = { ts: entry.ts || 0, data: entry.data };
      }
    });
    localStorage.setItem(LS_RECENTES, JSON.stringify(payload));
  } catch (err) {}
}

function getCachedPosts(category){
  const cat = (category || "game").toLowerCase();
  const entry = postsCache.get(cat);
  if(!entry) return null;
  if(entry.ts && Date.now() - entry.ts > POSTS_CACHE_TTL){
    postsCache.delete(cat);
    persistPostsCache();
    return null;
  }
  return entry.data;
}

function setCachedPosts(category, data){
  if(!Array.isArray(data)) return;
  const cat = (category || "game").toLowerCase();
  postsCache.set(cat, { ts: Date.now(), data });
  persistPostsCache();
}

function invalidatePostsCache(category){
  if(typeof category === "string" && category){
    postsCache.delete(category.toLowerCase());
  }else{
    postsCache.clear();
  }
  persistPostsCache();
}

function persistSocialsCache(){
  if(typeof localStorage === "undefined") return;
  try {
    const payload = { ts: socialsCacheState.ts || 0, data: Array.isArray(socialsCacheState.data) ? socialsCacheState.data : [] };
    localStorage.setItem(LS_SOCIALS, JSON.stringify(payload));
  } catch (err) {}
}

function getCachedSocials(){
  if(!Array.isArray(socialsCacheState.data)) return null;
  if(!socialsCacheState.ts) return null;
  if(Date.now() - socialsCacheState.ts > SOCIALS_CACHE_TTL) return null;
  return socialsCacheState.data;
}

function setCachedSocials(data){
  socialsCacheState.ts = Date.now();
  socialsCacheState.data = Array.isArray(data) ? data : [];
  persistSocialsCache();
}

const adminNotifications = {
  wrap: null,
  button: null,
  count: null,
  panel: null,
  list: null,
  empty: null,
  refreshBtn: null,
  initialized: false,
  panelOpen: false,
  loading: false,
  error: null,
  items: [],
  timer: null,
  lastSeenAt: loadAdminNotificationsSeen(),
  lastFetchedAt: null,
  docClickHandler: null,
  docKeyHandler: null,
};

// Recalcula el tamaño de página en función del espacio disponible en la cuadrícula
function recalcPageSize(){
  const grid = document.querySelector('.grid');
  if(!grid) return;

  const styles = getComputedStyle(grid);
  const colGap = parseFloat(styles.columnGap) || 0;
  const rowGap = parseFloat(styles.rowGap) || 0;
  const gridW  = grid.clientWidth;
  const gridH  = grid.clientHeight;
  const minTileW = 260; // coincide con minmax del CSS

  const cols = Math.max(1, Math.floor((gridW + colGap) / (minTileW + colGap)));
  const tileW = (gridW - colGap * (cols - 1)) / cols;
  const tileH = tileW * 9 / 16; // aspect-ratio 16:9
  const rows = Math.max(1, Math.floor((gridH + rowGap) / (tileH + rowGap)));

  PAGE_SIZE = rows * cols;
}

/* =========================
   Utilidades base
   ========================= */
function rehydrate() {
  if(typeof localStorage === "undefined") return;
  const now = Date.now();
  let migratePosts = false;
  try {
    const raw = localStorage.getItem(LS_RECENTES);
    if(raw){
      const parsed = JSON.parse(raw);
      if(Array.isArray(parsed)){
        const cat = window.currentCategory || "game";
        postsCache.set(cat.toLowerCase(), { ts: now, data: parsed });
        migratePosts = true;
      }else if(parsed && typeof parsed === "object"){
        if(typeof parsed.lastCategory === "string" && parsed.lastCategory.trim()){
          window.currentCategory = parsed.lastCategory.trim().toLowerCase();
        }
        const entries = parsed.entries && typeof parsed.entries === "object" ? parsed.entries : {};
        Object.entries(entries).forEach(([key, value])=>{
          if(!value || !Array.isArray(value.data)) return;
          const normalizedKey = (key || "game").toLowerCase();
          const ts = typeof value.ts === "number" && value.ts > 0 ? value.ts : now;
          postsCache.set(normalizedKey, { ts, data: value.data });
        });
      }
    }
  } catch (err) {}

  const preferredKey = (window.currentCategory || "game").toLowerCase();
  const preferredEntry = postsCache.get(preferredKey);
  if(preferredEntry && Array.isArray(preferredEntry.data)){
    recientes = preferredEntry.data;
    window.currentCategory = preferredKey;
  }else{
    for(const [key, entry] of postsCache.entries()){
      if(entry && Array.isArray(entry.data)){
        recientes = entry.data;
        window.currentCategory = key;
        break;
      }
    }
  }
  if(migratePosts) persistPostsCache();

  let migrateSocials = false;
  try {
    const rawS = localStorage.getItem(LS_SOCIALS);
    if(rawS){
      const parsedS = JSON.parse(rawS);
      if(Array.isArray(parsedS)){
        socialsCacheState.ts = now;
        socialsCacheState.data = parsedS;
        socials = parsedS;
        migrateSocials = true;
      }else if(parsedS && typeof parsedS === "object" && Array.isArray(parsedS.data)){
        socialsCacheState.ts = typeof parsedS.ts === "number" && parsedS.ts > 0 ? parsedS.ts : now;
        socialsCacheState.data = parsedS.data;
        socials = parsedS.data;
      }
    }
  } catch (err) {}
  if(migrateSocials) persistSocialsCache();

  isAdmin = localStorage.getItem(LS_ADMIN) === "1";
  try { const t=localStorage.getItem("tgx_admin_token"); if(!isAdmin && t && t.trim()) isAdmin=true; } catch (err) {}
}
rehydrate();

function persistAdmin(flag){ try{ localStorage.setItem(LS_ADMIN, flag ? "1" : "0"); }catch (err) {} }
function preload(src){ const img = new Image(); img.src = src; }

function loadAdminNotificationsSeen(){
  if(typeof localStorage === "undefined") return null;
  try{
    const raw = localStorage.getItem(LS_ADMIN_NOTIF);
    if(!raw) return null;
    const ts = Date.parse(raw);
    if(Number.isNaN(ts)) return null;
    return new Date(ts).toISOString();
  }catch(err){
    return null;
  }
}

function saveAdminNotificationsSeen(value){
  if(typeof localStorage === "undefined") return;
  try{
    if(value){
      localStorage.setItem(LS_ADMIN_NOTIF, value);
    }else{
      localStorage.removeItem(LS_ADMIN_NOTIF);
    }
  }catch(err){}
}

function parseTime(value){
  const time = value ? Date.parse(value) : NaN;
  return Number.isNaN(time) ? 0 : time;
}

function formatCategoryLabel(cat){
  const key = typeof cat === "string" ? cat.toLowerCase() : "";
  return CATEGORY_LABELS[key] || CATEGORY_LABELS.game;
}

function toHex(buf){ const v=new Uint8Array(buf); return Array.from(v).map(b=>b.toString(16).padStart(2,"0")).join(""); }
async function sha256(str){ const enc=new TextEncoder().encode(str); const digest=await crypto.subtle.digest("SHA-256",enc); return toHex(digest); }
function genSaltHex(len=16){ const a=new Uint8Array(len); crypto.getRandomValues(a); return Array.from(a).map(b=>b.toString(16).padStart(2,"0")).join(""); }
async function hashCreds(user,pin,salt){ const key=`${user}::${pin}::${salt}`; return sha256(key); }

/* =========================
   API: Posts
   ========================= */
async function apiList(category = window.currentCategory, { force = false } = {}) {
  const cat = (category || "game").toLowerCase();
  if(!force){
    const cached = getCachedPosts(cat);
    if(cached) return cached;
  }

  const qs = new URLSearchParams({ lite: "1", limit: String(POSTS_LIST_LIMIT) });
  if(cat) qs.set("category", cat);
  const options = force ? { cache: "no-store" } : undefined;
  const r = await fetch(`${API_POSTS}?${qs.toString()}`, options);
  if (!r.ok) throw new Error("No se pudo listar posts");
  const j = await r.json();
  const data = Array.isArray(j)
    ? j.map(g => ({ ...g, link_ok: Boolean(g.link_ok), drive_id: g.drive_id || extractDriveId(g.first_link) }))
    : j;
  if(Array.isArray(data)) setCachedPosts(cat, data);
  return data;
}
async function apiCreate(data, token){
  const r = await fetch(API_POSTS, {
    method:"POST",
    headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${token||""}` },
    body: JSON.stringify(data)
  });
  if(!r.ok){ const t=await r.text().catch(()=> ""); throw new Error(`Crear falló: ${r.status} ${r.statusText} :: ${t}`); }
  const result = await r.json();
  invalidatePostsCache(data?.category);
  return result;
}
async function apiGet(id){
  if(fullCache.has(id)) return fullCache.get(id);
  const r = await fetch(`${API_POSTS}/${id}`, { cache:"no-store" });
  if(!r.ok) throw new Error("No se pudo obtener post");
  const j = await r.json();
  if(j&&typeof j==="object"){ j.link_ok=Boolean(j.link_ok); if(!j.drive_id && j.first_link) j.drive_id=extractDriveId(j.first_link); }
  fullCache.set(id, j);
  return j;
}
async function apiGetVideo(id){
  if(videoCache.has(id)) return videoCache.get(id);
  const r = await fetch(`${API_POSTS}/${id}?video=1`, { cache:"no-store" });
  if(!r.ok) return null;
  const j = await r.json();
  videoCache.set(id, j?.previewVideo || null);
  return j?.previewVideo || null;
}
async function apiUpdate(id, patch, token){
  const r = await fetch(`${API_POSTS}/${id}`, {
    method:"PUT",
    headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${token||""}` },
    body: JSON.stringify(patch)
  });
  if(!r.ok){ const t=await r.text().catch(()=> ""); throw new Error(`Update falló: ${t}`); }
  fullCache.delete(id);
  const result = await r.json();
  invalidatePostsCache();
  return result;
}
async function apiDelete(id, token){
  const r = await fetch(`${API_POSTS}/${id}`, { method:"DELETE", headers:{ "Authorization":`Bearer ${token||""}` } });
  if(!r.ok){ const t=await r.text().catch(()=> ""); throw new Error(`Delete falló: ${t}`); }
  fullCache.delete(id); videoCache.delete(id);
  invalidatePostsCache();
  return r.json();
}

/* =========================
   API: Socials
   ========================= */
async function socialsList({ force = false } = {}){
  if(!force){
    const cached = getCachedSocials();
    if(cached) return cached;
  }
  const options = force ? { cache: "no-store" } : undefined;
  const r = await fetch(API_SOC, options);
  if(!r.ok) throw new Error("No se pudo listar socials");
  const data = await r.json();
  if(Array.isArray(data)) setCachedSocials(data);
  return data;
}
async function socialsCreate(s, token){
  const r = await fetch(API_SOC, {
    method:"POST",
    headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${token||""}` },
    body: JSON.stringify(s)
  });
  if(!r.ok){ const t=await r.text().catch(()=> ""); throw new Error(`Social crear falló: ${t}`); }
  return r.json();
}
async function socialsDelete(id, token){
  const r = await fetch(`${API_SOC}/${id}`, { method:"DELETE", headers:{ "Authorization":`Bearer ${token||""}` } });
  if(!r.ok){ const t=await r.text().catch(()=> ""); throw new Error(`Social delete falló: ${t}`); }
  return r.json();
}

/* =========================
   API: Admin Keys
   ========================= */
async function adminLoginByKeyHash(keyHash) {
  const r = await fetch(`${API_ADM}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyHash })
  });
  if (!r.ok) return { ok: false };
  return r.json();
}
async function adminListKeys(token){
  const r = await fetch(`${API_ADM}`, { headers:{ "Authorization":`Bearer ${token||""}` } });
  if(!r.ok) throw new Error("No se pudo listar llaves");
  return r.json();
}
async function adminCreateKey(name, keyHash, token){
  const r = await fetch(`${API_ADM}`, {
    method:"POST",
    headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${token||""}` },
    body: JSON.stringify({ name, keyHash })
  });
  if(!r.ok){ const t=await r.text().catch(()=> ""); throw new Error(`Crear llave falló: ${t}`); }
  return r.json();
}
async function adminRevokeKey(id, token){
  const r = await fetch(`${API_ADM}/${id}`, { method:"DELETE", headers:{ "Authorization":`Bearer ${token||""}` } });
  if(!r.ok){ const t=await r.text().catch(()=> ""); throw new Error(`Revocar falló: ${t}`); }
  return r.json();
}

/* =========================
   Helpers de modal / focus
   ========================= */
function openModalFragment(fragment){ document.body.appendChild(fragment); setTimeout(()=>fragment.classList.add("active"),0); }
function closeModal(modalNode, removeTrap, onEscape){
  modalNode.classList.remove("active");
  document.body.style.overflow="";
  if(removeTrap) removeTrap();
  if(onEscape) modalNode.removeEventListener("keydown", onEscape);
  setTimeout(()=>{ try{ modalNode.remove(); }catch (err) {} }, 250);
}
function trapFocus(modalNode){
  const selectors=["a[href]","button:not([disabled])","textarea:not([disabled])","input:not([disabled])","select:not([disabled])","[tabindex]:not([tabindex='-1'])"];
  const getList = () => Array.from(modalNode.querySelectorAll(selectors.join(",")));
  function onKey(e){
    if(e.key!=="Tab") return;
    const it=getList(); if(!it.length) return;
    const first=it[0], last=it[it.length-1];
    if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
  }
  modalNode.addEventListener("keydown", onKey);
  return () => modalNode.removeEventListener("keydown", onKey);
}

/* =========================
   Media helpers
   ========================= */
function readAsDataURL(file){
  return new Promise((resolve,reject)=>{
    const fr=new FileReader();
    fr.onload = ()=> resolve(fr.result);
    fr.onerror= ()=> reject(new Error("No se pudo leer el archivo"));
    fr.readAsDataURL(file);
  });
}
async function compressImage(file,{maxW=960,maxH=960,quality=0.8,mime="image/webp"}={}){
  const blobUrl=URL.createObjectURL(file);
  const img=await new Promise((res,rej)=>{
    const im=new Image();
    im.onload=()=> res(im);
    im.onerror=()=> rej(new Error("No se pudo cargar la imagen"));
    im.src=blobUrl;
  });
  const ratio=Math.min(maxW/img.width,maxH/img.height,1);
  const nw=Math.round(img.width*ratio), nh=Math.round(img.height*ratio);
  const canvas=document.createElement("canvas");
  canvas.width=nw; canvas.height=nh;
  const ctx=canvas.getContext("2d");
  ctx.drawImage(img,0,0,nw,nh);
  const out=canvas.toDataURL(mime, quality);
  URL.revokeObjectURL(blobUrl);
  return out;
}

/* =========================
   Chips de enlace y plataforma
   ========================= */
function platformFromUrl(u){
  const s=(u||"").toLowerCase();
  if (s.startsWith("magnet:") || s.endsWith(".torrent") || s.includes("utorrent")) return "torrent";
  if (s.includes("mega.nz")) return "mega";
  if (s.includes("mediafire.com")) return "mediafire";
  if (s.includes("drive.google.com")) return "drive";
  if (s.includes("dropbox.com")) return "dropbox";
  if (s.includes("1drv.ms") || s.includes("onedrive")) return "onedrive";
  if (s.includes("youtube.com") || s.includes("youtu.be")) return "youtube";
  if (s.includes("gofile.io")) return "gofile";
  if (s.includes("pixeldrain.com")) return "pixeldrain";
  return "generic";
}
function escapeHtml(str){
  return String(str ?? "").replace(/[&<>'"]/g, (ch)=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    "'":"&#39;",
    '"':"&quot;"
  })[ch] || ch);
}

function insertLinkChip(editorArea){
  editorArea.focus();
  const text=(prompt("Nombre a mostrar del enlace:")||"").trim();
  if(!text) return;
  let url=(prompt("Pega la URL del enlace o el ID de Drive:")||"").trim();
  if(!url) return;
  let driveId=null;
  if(!/^[a-z]+:\/\//i.test(url)){
    if(/^[A-Za-z0-9_-]{10,}$/.test(url)){
      driveId=url;
    }else if(/^[A-Za-z0-9]{5,}$/.test(url)){
      url=`https://gofile.io/d/${url}`;
    }
  }
  if(!driveId) driveId=extractDriveId(url);
  if(driveId) url=`https://drive.google.com/file/d/${driveId}`;
  if(!/^https?:\/\//i.test(url) && !url.startsWith("magnet:")) url="https://"+url;
  const plat=driveId ? "drive" : platformFromUrl(url);
  const html=`<a href="${url.replace(/"/g,"&quot;")}" target="_blank" rel="noopener" class="link-chip chip-${plat}"><span class="chip-dot"></span>${text.replace(/[<>]/g,"")}</a>`;
  document.execCommand("insertHTML", false, html);
}

async function insertVideoPreview(editorArea){
  editorArea.focus();
  const raw = (prompt("Pega la URL del video:") || "").trim();
  if(!raw) return;

  let url = raw.replace(/^\s+|\s+$/g, "");
  if(!url) return;
  if(/^\/\//.test(url)) url = "https:" + url;
  if(!/^https?:\/\//i.test(url)) url = `https://${url}`;
  url = url.replace(/^http:\/\//i, "https://");

  let normalizedUrl = url;
  try {
    const parsed = new URL(url);
    if(parsed.protocol !== "https:") parsed.protocol = "https:";
    normalizedUrl = parsed.toString();
  } catch {
    return;
  }

  let title = "";
  let thumbnail = "";
  let provider = "";

  const ytMatch = normalizedUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i);
  if(ytMatch){
    provider = "YouTube";
    thumbnail = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  }

  if(!thumbnail){
    const odyMatch = normalizedUrl.match(/odysee\.com\/(?:[^:]+:[^/]+\/)?[^:]+:([A-Za-z0-9]+)/i);
    if(odyMatch){
      provider = "Odysee";
      thumbnail = `https://thumbnails.lbry.com/${odyMatch[1]}`;
    }
  }

  try {
    const resp = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(normalizedUrl)}`, { mode: "cors" });
    if(resp.ok){
      const data = await resp.json();
      if(!title && data?.title) title = data.title;
      if(!thumbnail && data?.thumbnail_url) thumbnail = data.thumbnail_url;
      if(!provider && data?.provider_name) provider = data.provider_name;
    }
  } catch (err) {
    // Ignorar errores de red o CORS
  }

  if(!thumbnail){
    const safeHost = (()=>{ try{ return new URL(normalizedUrl).hostname; } catch{ return "video"; } })();
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 90'>`+
      `<rect width='160' height='90' rx='12' ry='12' fill='rgba(0,0,0,0.7)'/>`+
      `<text x='80' y='50' fill='white' font-family='sans-serif' font-size='16' text-anchor='middle'>${escapeHtml(safeHost)}</text>`+
      `</svg>`;
    thumbnail = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  const captionText = title || provider || (()=>{ try{ return new URL(normalizedUrl).hostname; } catch { return ""; } })();
  const altText = title || provider || "Previsualización de video";
  const figcaption = captionText ? `<figcaption>${escapeHtml(captionText)}</figcaption>` : "";
  const html = `<figure class="video-card">`+
    `<a href="${escapeHtml(normalizedUrl)}" target="_blank" rel="noopener" class="video-card-link">`+
    `<span class="video-card-play" aria-hidden="true">▶</span>`+
    `<img src="${escapeHtml(thumbnail)}" alt="${escapeHtml(altText)}" loading="lazy" />`+
    `</a>`+
    `${figcaption}`+
    `</figure>`;

  editorArea.focus();
  document.execCommand("insertHTML", false, html);
}
function extractFirstLink(html){
  const tmp=document.createElement("div");
  tmp.innerHTML=html||"";
  const a=tmp.querySelector("a[href]");
  return a ? a.getAttribute("href") : "";
}

function extractGofileId(url){
  if(!url) return null;
  const m=url.match(/gofile\.io\/(?:download|d)\/([^/?#]+)/i);
  return m ? m[1] : null;
}

function extractDriveId(url){
  if(!url) return null;
  const m = String(url).match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?export=download&id=|uc\?id=|drive\/folders\/)([A-Za-z0-9_-]+)/i);
  if(m) return m[1];
  const m2 = String(url).match(/[?&]id=([A-Za-z0-9_-]+)/);
  return m2 ? m2[1] : null;
}

/* =========================
   Linkcheck (sólo al crear/editar)
   ========================= */
async function fetchLinkOk(url){
  if(!url) return null;
  try{
    const r = await fetch(`${API_LINK}?url=${encodeURIComponent(url)}`, { cache:"no-store" });
    const j = await r.json();
    return !!j.ok;
  }catch (err){
    return null;
  }
}

/* =========================
   Badges visuales en tarjetas
   ========================= */
function applyPlayerModeBadge(tile, game = {}){
  if(!tile) return;
  const badge = tile.querySelector(".player-mode-badge");
  if(!badge) return;

  const category = (game?.category || window.currentCategory || "").toLowerCase();
  if(category !== "game"){
    badge.hidden = true;
    delete badge.dataset.mode;
    delete badge.dataset.label;
    badge.removeAttribute("title");
    badge.removeAttribute("aria-label");
    badge.removeAttribute("role");
    badge.setAttribute("aria-hidden", "true");
    badge.removeAttribute("tabindex");
    const img = badge.querySelector("img");
    if(img){
      img.removeAttribute("src");
      img.removeAttribute("alt");
    }
    return;
  }

  const rawMode = typeof game?.playerMode === "string" ? game.playerMode.trim() : "";
  const mode = rawMode.toLowerCase();
  const icon = PLAYER_MODE_ICONS[mode];
  const label = PLAYER_MODE_LABELS[mode];
  const img = badge.querySelector("img");

  if(!icon || !label){
    badge.hidden = true;
    delete badge.dataset.mode;
    delete badge.dataset.label;
    badge.removeAttribute("title");
    badge.removeAttribute("aria-label");
    badge.removeAttribute("role");
    badge.setAttribute("aria-hidden", "true");
    badge.removeAttribute("tabindex");
    if(img){
      img.removeAttribute("src");
      img.removeAttribute("alt");
    }
    return;
  }

  if(img){
    if(img.getAttribute("src") !== icon) img.src = icon;
    img.alt = label;
    img.setAttribute("aria-hidden", "true");
  }

  badge.hidden = false;
  badge.dataset.mode = mode;
  badge.dataset.label = label;
  badge.title = label;
  badge.setAttribute("aria-label", label);
  badge.setAttribute("role", "img");
  badge.setAttribute("aria-hidden", "false");
}

/* =========================
   Badges de estado (sin red)
   ========================= */
function platformIconSVG(plat){
  const sz=12; const common=`width="${sz}" height="${sz}" viewBox="0 0 24 24" aria-hidden="true"`;
  switch(plat){
    case "mega":      return `<svg ${common} fill="currentColor"><path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm5 15h-2v-4l-3 3-3-3v4H7V7h2l3 3 3-3h2v10z"/></svg>`;
    case "mediafire": return `<svg ${common} fill="currentColor"><path d="M3 15a6 6 0 0 1 6-6h10a2 2 0 0 1 0 4h-6a6 6 0 0 1-10 2z"/></svg>`;
    case "drive":     return `<svg ${common} fill="currentColor"><path d="M10 4h4l6 10-2 4H6l-2-4 6-10zm1 2-5 8h12l-5-8h-2z"/></svg>`;
    case "dropbox":   return `<svg ${common} fill="currentColor"><path d="m6 3 6 4-4 3-6-4 4-3Zm6 4 6-4 4 3-6 4-4-3Zm-10 6 6 4 4-3-6-4-4 3Zm10 1 4 3 6-4-4-3-6 4Z"/></svg>`;
    case "onedrive":  return `<svg ${common} fill="currentColor"><path d="M7 17h10a4 4 0 0 0 0-8 5 5 0 0 0-9-2 5 5 0 0 0-1 10Z"/></svg>`;
    case "youtube":   return `<svg ${common} fill="currentColor"><path d="M10 15l5-3-5-3v6z"/></svg>`;
    case "torrent":   return `<svg ${common} fill="currentColor"><path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm1 5v6h3l-4 4-4-4h3V7h2z"/></svg>`;
    case "gofile":    return `<svg ${common} fill="currentColor"><circle cx="12" cy="12" r="9"/></svg>`;
    case "pixeldrain":return `<svg ${common} fill="currentColor"><path d="M4 4h16v16H4z"/></svg>`;
    default:          return `<svg ${common} fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>`;
  }
}
function applyStatusBadge(tile, first_link, link_ok){
  let badge = tile.querySelector(".tile-info .badge");
  if(!badge){
    badge=document.createElement("span");
    badge.className="badge";
    tile.querySelector(".tile-info")?.appendChild(badge);
  }
  const plat = platformFromUrl(first_link || "");
  const platformClass = `pill-${plat}`;

  badge.className=`badge badge-status ${platformClass}`;
  badge.innerHTML=`<span class="pill-icon"></span><span class="pill-text"></span>`;
  badge.querySelector(".pill-icon").innerHTML = platformIconSVG(plat);

    if (link_ok) {
      badge.classList.add("status-ok");
      badge.querySelector(".pill-text").textContent = "Disponible";
    } else {
      badge.classList.add("status-checking");
      badge.querySelector(".pill-text").textContent = "Verificar";
    }
  }

/* =========================
   Editor enriquecido (SIN duplicar botones)
   ========================= */
function initRichEditor(editorRoot){
  const editorArea = editorRoot.querySelector(".editor-area");
  const toolbar    = editorRoot.querySelector(".rich-toolbar");
  if (!editorArea || !toolbar) return { getHTML:()=>"", setHTML:()=>{} };

  // Si faltan solo los botones de alineación, agrégalos (sin repetir B/I/U/etc.)
  if (!toolbar.querySelector(".rtb-align")) {
    const sep = document.createElement("span");
    sep.className = "rtb-sep";
    const wrap = document.createElement("span");
    wrap.className = "rtb-align-wrap";
    wrap.innerHTML = `
      <button type="button" class="rtb-btn rtb-align" data-align="left"   title="Alinear izquierda">⟸</button>
      <button type="button" class="rtb-btn rtb-align" data-align="center" title="Centrar">⟺</button>
      <button type="button" class="rtb-btn rtb-align" data-align="right"  title="Alinear derecha">⟹</button>
    `;
    toolbar.appendChild(sep);
    toolbar.appendChild(wrap);
  }

  const colorBtn  = toolbar.querySelector(".rtb-color");
  const colorInput= toolbar.querySelector(".rtb-color-input");

  function exec(cmd,val=null){ document.execCommand(cmd,false,val); editorArea.focus(); }

  toolbar.addEventListener("click",(e)=>{
    const btn=e.target.closest(".rtb-btn"); if(!btn) return;
    if (btn.classList.contains("rtb-link")) { insertLinkChip(editorArea); return; }
    if (btn.classList.contains("rtb-video")) { void insertVideoPreview(editorArea); return; }
    if (btn.classList.contains("rtb-align")) {
      const a = btn.dataset.align;
      if(a==="left")   exec("justifyLeft");
      if(a==="center") exec("justifyCenter");
      if(a==="right")  exec("justifyRight");
      return;
    }
    const {cmd, block, list} = btn.dataset;
    if (cmd) exec(cmd);
    if (block) exec("formatBlock", block.toUpperCase());
    if (list==="ul") exec("insertUnorderedList");
  });

  const fontSel=toolbar.querySelector(".rtb-font");
  if(fontSel){ fontSel.addEventListener("change", ()=>{ const v=fontSel.value.trim(); if(v) exec("fontName", v); else editorArea.focus(); }); }

  if (colorBtn && colorInput){
    colorBtn.addEventListener("click", ()=> colorInput.click());
    colorInput.addEventListener("input", ()=> exec("foreColor", colorInput.value));
  }

  return { getHTML: ()=>editorArea.innerHTML.trim(), setHTML: (h)=>{ editorArea.innerHTML=h||""; } };
}

/* =========================
   GRID + Paginación (thumbs)
   ========================= */
function getFilteredList(){
  if(!searchQuery) return recientes;
  const q = searchQuery.toLowerCase();
  return recientes.filter(g => (g.title||"").toLowerCase().includes(q));
}
function updatePager(totalPages){
  const pager  = document.getElementById("gridPager");
  if(!pager) return;
  const dashes = pager.querySelectorAll(".pager-dash");
  const liveStatus = pager.querySelector(".pager-live");

  const prevAvailable = page > 1;
  const nextAvailable = page < totalPages;

  const middleIndex = Math.floor(dashes.length / 2);

  dashes.forEach((dash, idx) => {
    dash.classList.remove("is-active", "is-available", "is-disabled");
    if(idx === 0){
      dash.classList.toggle("is-available", prevAvailable);
      dash.classList.toggle("is-disabled", !prevAvailable);
    }
    if(idx === dashes.length - 1){
      dash.classList.toggle("is-available", nextAvailable);
      dash.classList.toggle("is-disabled", !nextAvailable);
    }
  });

  if(dashes[middleIndex]) {
    dashes[middleIndex].classList.add("is-active");
  }

  if(liveStatus) {
    liveStatus.textContent = `Página ${page} de ${totalPages}`;
  }

  pager.style.display = (totalPages>1) ? "flex" : "none";
}
function attachHoverVideo(tile, g, vidEl){
  // Respeta ahorro de datos
  if (navigator.connection?.saveData) return;

  // Asegura elemento <video> SIN precarga
  if (!vidEl) {
    vidEl = document.createElement("video");
    vidEl.className = "tile-video";
    vidEl.muted = true;
    vidEl.playsInline = true;
    vidEl.preload = "none";
    vidEl.disablePictureInPicture = true;
    tile.appendChild(vidEl);
  }

  let loaded = false;

  async function ensureVideo(){
    if (loaded) return true;
    const src = await apiGetVideo(g.id); // devuelve dataURL o URL
    if (!src) return false;
    vidEl.src = src;
    try { vidEl.load(); } catch {}
    loaded = true;
    return true;
  }

  // Cancela descargas cuando sale de pantalla / hover
  function cancelDownload(){
    try { vidEl.pause(); } catch {}
    // Si es URL (no dataURL), vaciamos src para cortar la conexión
    if (!/^data:/i.test(vidEl.src)) {
      vidEl.removeAttribute("src");
      while (vidEl.firstChild) vidEl.removeChild(vidEl.firstChild);
      loaded = false;
      try { vidEl.load(); } catch {}
    }
    vidEl.classList.remove("playing");
  }

  // Limitar a 1 preview reproduciéndose
  vidEl.addEventListener("playing", () => {
    if (window.__tgxCurrentVideo && window.__tgxCurrentVideo !== vidEl) {
      try { window.__tgxCurrentVideo.pause(); } catch {}
    }
    window.__tgxCurrentVideo = vidEl;
    vidEl.classList.add("playing");
  });
  ["pause", "ended", "error"].forEach(ev =>
    vidEl.addEventListener(ev, () => vidEl.classList.remove("playing"))
  );

  const start = async () => {
    const ok = await ensureVideo();
    if (!ok) return;
    vidEl.currentTime = 0;
    vidEl.play().catch(()=>{});
  };
  const stop = () => cancelDownload();

  // Hover/teclado
  tile.addEventListener("pointerenter", start);
  tile.addEventListener("pointerleave", stop);
  tile.addEventListener("focus", start);
  tile.addEventListener("blur", stop);

  // Además: si sale del viewport, corta descarga
  if (!window.__tgxVidIO) {
    window.__tgxVidIO = new IntersectionObserver((entries)=>{
      for (const e of entries) {
        const v = e.target;
        if (!e.isIntersecting && v.__cancel) v.__cancel();
      }
    }, { rootMargin: "200px", threshold: 0.25 });
  }
  vidEl.__cancel = cancelDownload;
  window.__tgxVidIO.observe(vidEl);
}
function setupRecientesWheelPager(){
  const grid = document.getElementById("gridRecientes");
  if(!grid) return;

  const list = getFilteredList();
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));

  const removeHandler = () => {
    if(!grid.__wheelPagerHandler) return;
    grid.removeEventListener("wheel", grid.__wheelPagerHandler);
    grid.__wheelPagerHandler = null;
    grid.__wheelPagerBound = false;
  };

  if(totalPages <= 1){
    removeHandler();
    return;
  }

  if(grid.__wheelPagerBound) return;

  const handler = (event) => {
    const listInner = getFilteredList();
    const totalPagesInner = Math.max(1, Math.ceil(listInner.length / PAGE_SIZE));
    if(totalPagesInner <= 1){
      removeHandler();
      return;
    }

    event.preventDefault();

    const now = Date.now();
    if(now - recientesWheelCooldownTs < 200) return;

    const direction = event.deltaY > 0 ? 1 : event.deltaY < 0 ? -1 : 0;
    if(direction === 0) return;

    if(direction > 0){
      page = page === totalPagesInner ? 1 : page + 1;
    }else{
      page = page === 1 ? totalPagesInner : page - 1;
    }

    recientesWheelCooldownTs = now;
    renderRow(true);
  };

  grid.__wheelPagerHandler = handler;
  grid.__wheelPagerBound = true;
  grid.addEventListener("wheel", handler, { passive: false });
}

function renderRow(keepScroll=false){
  const grid = document.getElementById("gridRecientes");
  if(!grid) return;
  recalcPageSize();

  const list = getFilteredList();
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  if(page > totalPages) page = totalPages;

  const start = (page-1) * PAGE_SIZE;
  const slice = list.slice(start, start + PAGE_SIZE);

  grid.innerHTML = "";

  if(isAdmin){
    const addTile = document.createElement("div");
    addTile.className = "add-game-tile";
    addTile.tabIndex = 0;
    addTile.innerHTML = "<span>+</span>";
    addTile.addEventListener("click", openNewGameModal);
    grid.appendChild(addTile);
  }

  const placeholder = "assets/images/construction/en-proceso.svg";

  slice.forEach((g)=>{
    const node = template.content.cloneNode(true);
    const tile = node.querySelector(".tile");
    const cover= node.querySelector(".cover");
    const title= node.querySelector(".title");
    const vid  = node.querySelector(".tile-video");

    title.textContent = g.title || "";
    tile.tabIndex=0;
    tile.addEventListener("click", ()=> openGameLazy(g));

    // Miniatura (sin pedir detalle)
    cover.style.backgroundImage = `url(${g.image_thumb || placeholder})`;

    // Badge de estado (usando first_link/link_ok del lite)
    applyStatusBadge(tile, g.first_link || "", g.link_ok);
    applyPlayerModeBadge(tile, g);

    grid.appendChild(node);
    attachHoverVideo(tile, g, vid);
  });

  const tiles = grid.querySelectorAll('.tile');
  const third = tiles[2];        // tercera portada (índice 2)
  if(third && !window.__previewHintShown){
    window.__previewHintShown = true;
    setTimeout(()=>{
      const bubble = document.createElement('div');
      bubble.className = 'preview-bubble';
      bubble.textContent = '¿Quieres ver una preview del juego? ¡Pon el mouse sobre la portada!';
      document.body.appendChild(bubble);
      const rect = third.getBoundingClientRect();
      bubble.style.left = `${rect.left + rect.width/2}px`;
      bubble.style.top  = `${rect.top}px`;
      bubble.style.transform = 'translate(-50%, -100%)';
      requestAnimationFrame(()=> bubble.classList.add('show'));
      const hide = ()=>{
        bubble.remove();
        third.removeEventListener('pointerenter', onEnter);
      };
      const onEnter = ()=>{ hide(); clearTimeout(hideTimer); };
      const hideTimer = setTimeout(hide, 8000);
      third.addEventListener('pointerenter', onEnter, { once: true });
    }, 3000);
  }
  updatePager(totalPages);
  if(!keepScroll) grid.scrollTo({ top: 0, behavior: "smooth" });
  setupRecientesWheelPager();
}

/* =========================
   HERO simple
   ========================= */
function renderHeroCarousel(){
  const hero = document.querySelector(".hero");
  if(!hero) return;
  const sideAds = hero.querySelectorAll(".business-slot-left, .business-slot-right");
  hero.classList.toggle("hero--simple", sideAds.length === 0);
}

/* =========================
   Modal ver juego (carga detalle al abrir) — SIN imagen
   ========================= */
function bindModalChipLinks(container, game){
  if(!container) return;
  container.querySelectorAll("a.chip-gofile").forEach(a => {
    const id = extractGofileId(a.getAttribute("href"));
    if(!id) return;
    a.addEventListener("click", ev => {
      ev.preventDefault();
      openGofileFolder(id, game?.title || "");
    });
    a.removeAttribute("target");
    a.href = "#";
  });
  container.querySelectorAll("a.chip-drive").forEach(a => {
    const id = extractDriveId(a.getAttribute("href"));
    if(!id) return;
    a.addEventListener("click", ev => {
      ev.preventDefault();
      downloadFromDrive({ id, name: game?.title || a.textContent || "" });
    });
    a.removeAttribute("target");
    a.href = "#";
  });
}
function setModalDescription(descEl, html, game){
  if(!descEl) return;
  const target = descEl.querySelector(".game-modal-body") || descEl;
  const finalHtml = (html === undefined || html === null || (typeof html === "string" && html.trim() === ""))
    ? "Sin descripción"
    : html;
  target.innerHTML = finalHtml;
  bindModalChipLinks(target, game);
}

const commentCache = new Map();

function normalizeComment(entry = {}){
  if(!entry || typeof entry !== "object") return null;
  const aliasRaw = typeof entry.alias === "string" ? entry.alias.trim() : "";
  const messageRaw = typeof entry.message === "string" ? entry.message : "";
  const roleRaw = typeof entry.role === "string" ? entry.role.toLowerCase() : "user";
  const created = entry.createdAt || entry.created_at || null;
  const parentId = entry.parentId || entry.parent_id || null;
  const pinnedAt = entry.pinnedAt || entry.pinned_at || null;
  const postTitleRaw = typeof entry.postTitle === "string" ? entry.postTitle : (typeof entry.post_title === "string" ? entry.post_title : "");
  const postCategoryRaw = typeof entry.postCategory === "string" ? entry.postCategory : (typeof entry.post_category === "string" ? entry.post_category : "");
  return {
    id: entry.id || entry.commentId || entry.comment_id || null,
    postId: entry.postId || entry.post_id || null,
    alias: aliasRaw || "Anónimo",
    message: messageRaw,
    role: roleRaw === "admin" ? "admin" : "user",
    createdAt: created,
    parentId: parentId,
    pinnedAt: pinnedAt,
    postTitle: postTitleRaw || "",
    postCategory: postCategoryRaw ? postCategoryRaw.toLowerCase() : "",
  };
}

function cloneComments(list){
  return Array.isArray(list) ? list.map(item => ({ ...item })) : [];
}

async function commentsList(postId, { force = false } = {}){
  if(!postId) return [];
  const cacheKey = String(postId);
  if(!force && commentCache.has(cacheKey)){
    return cloneComments(commentCache.get(cacheKey));
  }
  const qs = new URLSearchParams({ postId: cacheKey });
  const res = await fetch(`${API_COMMENTS}?${qs.toString()}`, { cache: "no-store" });
  if(!res.ok){
    const text = await res.text().catch(()=> "");
    throw new Error(`No se pudieron obtener los comentarios: ${text || res.status}`);
  }
  const data = await res.json().catch(()=> []);
  const list = Array.isArray(data) ? data.map(normalizeComment).filter(Boolean) : [];
  commentCache.set(cacheKey, list);
  return cloneComments(list);
}

async function commentsCreate(postId, payload = {}){
  if(!postId) throw new Error("Falta el ID de la publicación");
  const cacheKey = String(postId);
  const headers = { "Content-Type": "application/json" };
  const token = typeof payload.token === "string" ? payload.token.trim() : "";
  if(token) headers.Authorization = `Bearer ${token}`;
  const body = {
    postId: cacheKey,
    alias: payload.alias,
    email: payload.email,
    message: payload.message,
    parentId: payload.parentId,
  };
  const res = await fetch(API_COMMENTS, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
  if(!res.ok){
    const text = await res.text().catch(()=> "");
    throw new Error(`No se pudo publicar el comentario: ${text || res.status}`);
  }
  const data = await res.json().catch(()=> null);
  const normalized = normalizeComment(data);
  if(!normalized) return null;
  const existing = commentCache.get(cacheKey) || [];
  commentCache.set(cacheKey, [...existing, normalized]);
  return { ...normalized };
}

async function commentsDelete(commentId, postId, token){
  if(!commentId) throw new Error("Falta el ID del comentario");
  if(!token) throw new Error("Falta AUTH_TOKEN");
  const cacheKey = postId ? String(postId) : null;
  const qs = cacheKey ? `?postId=${encodeURIComponent(cacheKey)}` : "";
  const res = await fetch(`${API_COMMENTS}/${commentId}${qs}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if(!res.ok){
    const text = await res.text().catch(()=> "");
    throw new Error(`No se pudo eliminar el comentario: ${text || res.status}`);
  }
  if(cacheKey && commentCache.has(cacheKey)){
    const next = commentCache
      .get(cacheKey)
      .filter(entry => entry?.id !== commentId && entry?.parentId !== commentId);
    commentCache.set(cacheKey, next);
  }
  return true;
}

async function commentsPin(commentId, postId, pinned, token){
  if(!commentId) throw new Error("Falta el ID del comentario");
  if(!token) throw new Error("Falta AUTH_TOKEN");
  const cacheKey = postId ? String(postId) : null;
  const qs = cacheKey ? `?postId=${encodeURIComponent(cacheKey)}` : "";
  const res = await fetch(`${API_COMMENTS}/${commentId}${qs}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pinned: Boolean(pinned) })
  });
  if(!res.ok){
    const text = await res.text().catch(()=> "");
    throw new Error(`No se pudo actualizar el comentario: ${text || res.status}`);
  }
  const data = await res.json().catch(()=> null);
  const normalized = normalizeComment(data);
  if(cacheKey && commentCache.has(cacheKey) && normalized){
    const next = commentCache
      .get(cacheKey)
      .map(entry => entry?.id === normalized.id ? normalized : entry);
    commentCache.set(cacheKey, next);
  }
  return normalized;
}

function formatCommentDate(timestamp){
  try{
    const date = new Date(timestamp);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }catch(err){
    return "";
  }
}
function openGameLazy(game){
  const hasFullData = game && typeof game.description === "string" && game.description.trim() !== "";
  const modal = openGame(game, { initialState: hasFullData ? null : "loading" });
  const postId = game?.id;
  if(!postId) return modal;
  if(hasFullData) return modal;
  apiGet(postId)
    .then(full => {
      if(!full) return;
      const data = { ...game, ...full };
      modal?.update?.(data);
    })
    .catch(err => {
      console.error("[openGameLazy] detalle falló", err);
      modal?.showError?.("No se pudo cargar la información adicional. Revisa tu conexión.");
    });
  return modal;
}
function openGame(initialGame, options = {}){
  const modal = modalTemplate.content.cloneNode(true);
  const modalNode    = modal.querySelector(".tw-modal");
  const modalContent = modal.querySelector(".tw-modal-content");
  const modalTitle   = modal.querySelector(".tw-modal-title");
  const modalDesc    = modal.querySelector(".tw-modal-description");
  const modalClose   = modal.querySelector(".tw-modal-close");
  const commentSection = modal.querySelector(".game-modal-comments");
  const commentList = commentSection?.querySelector(".comment-list") || null;
  const commentEmpty = commentSection?.querySelector(".comment-empty") || null;
  const commentTab = commentSection?.querySelector(".comment-tab") || null;
  const commentToggle = commentSection?.querySelector(".comment-tab-toggle") || null;
  const commentTabBody = commentSection?.querySelector(".comment-tab-body") || null;
  const commentFormWrap = commentSection?.querySelector(".comment-form-wrap") || null;
  const commentForm = commentSection?.querySelector(".comment-form") || null;
  const commentFormToggle = commentSection?.querySelector(".comment-form-toggle") || null;
  const commentCountBadge = commentSection?.querySelector(".comment-count") || null;
  const commentCountLabel = commentSection?.querySelector(".comment-count-label") || null;
  const commentStatus = commentSection?.querySelector(".comment-status") || null;
  const commentStatusText = commentStatus?.querySelector?.(".comment-status-text") || null;
  const commentRetry = commentStatus?.querySelector?.(".comment-retry") || null;
  const commentSubmitButton = commentForm?.querySelector?.(".comment-submit") || null;
  const commentFormReplying = commentForm?.querySelector?.(".comment-form-replying") || null;
  const commentFormReplyTarget = commentFormReplying?.querySelector?.(".comment-form-reply-target") || null;
  const commentFormCancelReply = commentFormReplying?.querySelector?.(".comment-form-cancel-reply") || null;
  const { initialState = null, initialMessage = null } = options || {};
  let currentGame = { ...initialGame };
  let commentTabOpenState = false;
  let commentFormExpanded = false;
  let commentTabAnimationTimer = null;
  let commentTabHeadingTimer = null;
  let commentsState = { items: [], loading: false, error: null };
  let lastLoadedPostId = null;
  const expandedReplies = new Set();
  let replyTargetId = null;
  let replyTargetAlias = "";
  let openActionsMenu = null;
  let highlightCommentId = null;
  let highlightPendingScroll = false;
  const timerHost = typeof window !== "undefined" ? window : globalThis;
  const commentPanelMinWidth = 280;
  const commentPanelMaxWidth = 420;
  const commentPanelGutter = 32;

  const getViewportWidth = ()=>{
    if(typeof window !== "undefined" && Number.isFinite(window.innerWidth)){
      return window.innerWidth;
    }
    return modalContent?.ownerDocument?.documentElement?.clientWidth || 0;
  };

  const updateCommentLayout = ()=>{
    if(!commentSection || !commentTab || !modalContent) return;
    const viewportWidth = getViewportWidth();
    if(!viewportWidth) return;
    const rect = modalContent.getBoundingClientRect();
    const available = viewportWidth - rect.right - commentPanelGutter;
    const shouldStack = available < commentPanelMinWidth;
    commentSection.classList.toggle("is-stacked", shouldStack);
    if(shouldStack){
      commentTab.style.removeProperty("--comment-panel-width");
    }else{
      const width = Math.max(commentPanelMinWidth, Math.min(commentPanelMaxWidth, available));
      commentTab.style.setProperty("--comment-panel-width", `${Math.round(width)}px`);
    }
  };

  const focusCommentTextarea = ()=>{
    if(!commentForm) return;
    const textarea = commentForm.querySelector("textarea[name='comment']");
    if(!textarea) return;
    const focusTask = ()=> textarea.focus({ preventScroll: false });
    if(typeof timerHost?.requestAnimationFrame === "function"){
      timerHost.requestAnimationFrame(focusTask);
    }else{
      focusTask();
    }
  };

  const focusCommentToggle = ()=>{
    if(!commentFormToggle) return;
    const focusTask = ()=> commentFormToggle.focus({ preventScroll: false });
    if(typeof timerHost?.requestAnimationFrame === "function"){
      timerHost.requestAnimationFrame(focusTask);
    }else{
      focusTask();
    }
  };

  const setCommentFormExpanded = (expanded, { focus = false } = {})=>{
    const isExpanded = Boolean(expanded);
    commentFormExpanded = isExpanded;
    if(commentFormWrap){
      commentFormWrap.dataset.formOpen = isExpanded ? "true" : "false";
      commentFormWrap.classList.toggle("is-form-open", isExpanded);
    }
    if(commentForm){
      commentForm.hidden = !isExpanded;
    }
    if(commentFormToggle){
      commentFormToggle.hidden = isExpanded;
      commentFormToggle.setAttribute("aria-expanded", String(isExpanded));
    }
    if(isExpanded){
      if(focus) focusCommentTextarea();
    }else if(focus){
      focusCommentToggle();
    }
  };

  const triggerCommentTabAnimation = (isOpen)=>{
    if(!commentTab) return;
    commentTab.classList.remove("is-animating-open", "is-animating-close");
    const className = isOpen ? "is-animating-open" : "is-animating-close";
    commentTab.classList.add(className);
    if(commentTabAnimationTimer) timerHost.clearTimeout(commentTabAnimationTimer);
    commentTabAnimationTimer = timerHost.setTimeout(()=>{
      commentTab.classList.remove(className);
    }, isOpen ? 720 : 560);
  };

  const setCommentTabHeaderState = (enabled, delay = 0)=>{
    if(!commentTab) return;
    if(commentTabHeadingTimer) timerHost.clearTimeout(commentTabHeadingTimer);
    const apply = ()=>{
      commentTab.classList.toggle("is-header-open", Boolean(enabled));
      commentTabHeadingTimer = null;
    };
    if(delay > 0){
      commentTabHeadingTimer = timerHost.setTimeout(apply, delay);
    }else{
      apply();
    }
  };

  const setCommentStatus = (message, { kind = "info", showRetry = false } = {})=>{
    if(!commentStatus) return;
    if(!message){
      commentStatus.hidden = true;
      commentStatus.dataset.kind = "";
      commentStatus.dataset.showRetry = "false";
      if(commentStatusText) commentStatusText.textContent = "";
      if(commentRetry) commentRetry.disabled = false;
      return;
    }
    commentStatus.hidden = false;
    commentStatus.dataset.kind = kind;
    commentStatus.dataset.showRetry = showRetry ? "true" : "false";
    if(commentStatusText){
      commentStatusText.textContent = message;
    }else{
      commentStatus.textContent = message;
    }
    if(commentRetry) commentRetry.disabled = kind === "loading";
  };

  const applyTitle = ()=>{ if(modalTitle) modalTitle.textContent = currentGame?.title || "Sin título"; };
  const renderDescription = ()=> setModalDescription(modalDesc, currentGame?.description, currentGame);
  const updateCommentCounters = (total)=>{
    if(commentCountBadge) commentCountBadge.textContent = String(total);
    if(commentCountLabel) commentCountLabel.textContent = total === 1 ? "(1 comentario)" : `(${total} comentarios)`;
  };
  const closeOpenActionsMenu = ()=>{
    if(!openActionsMenu) return;
    const toggle = openActionsMenu.closest(".comment-actions")?.querySelector?.(".comment-actions-toggle");
    if(toggle) toggle.setAttribute("aria-expanded", "false");
    openActionsMenu.hidden = true;
    openActionsMenu = null;
  };

  const updateReplyIndicator = ()=>{
    if(!commentForm) return;
    if(commentFormReplying){
      if(replyTargetId){
        commentFormReplying.hidden = false;
        if(commentFormReplyTarget) commentFormReplyTarget.textContent = replyTargetAlias || "Anónimo";
      }else{
        commentFormReplying.hidden = true;
      }
    }
    if(replyTargetId){
      commentForm.dataset.replyId = replyTargetId;
    }else{
      delete commentForm.dataset.replyId;
    }
  };

  const setReplyTarget = (comment)=>{
    if(comment && comment.id){
      replyTargetId = String(comment.id);
      replyTargetAlias = comment.alias || "Anónimo";
    }else{
      replyTargetId = null;
      replyTargetAlias = "";
    }
    updateReplyIndicator();
  };

  const setHighlightTarget = (commentId, parentId)=>{
    highlightCommentId = commentId ? String(commentId) : null;
    highlightPendingScroll = Boolean(highlightCommentId);
    if(parentId){
      expandedReplies.add(String(parentId));
    }
  };

  updateReplyIndicator();
  setCommentFormExpanded(false);

  commentFormCancelReply?.addEventListener("click", (ev)=>{
    ev.preventDefault();
    setReplyTarget(null);
    closeOpenActionsMenu();
  });

  commentFormToggle?.addEventListener("click", ()=>{
    if(!commentTab?.classList.contains("is-open")){
      setCommentTabState(true);
    }
    setCommentFormExpanded(true, { focus: true });
  });

  modalNode?.addEventListener("click", (ev)=>{
    if(!ev.target.closest(".comment-actions")){
      closeOpenActionsMenu();
    }
  });

  const parseTimestamp = (value)=>{
    const time = value ? Date.parse(value) : NaN;
    return Number.isNaN(time) ? 0 : time;
  };

  const buildCommentTree = (items)=>{
    const map = new Map();
    const roots = [];
    (items || []).forEach(entry => {
      if(!entry || !entry.id) return;
      map.set(entry.id, { ...entry, replies: [] });
    });
    map.forEach(node => {
      if(node.parentId && map.has(node.parentId)){
        map.get(node.parentId).replies.push(node);
      }else{
        roots.push(node);
      }
    });
    map.forEach(node => {
      node.replies.sort((a, b)=> parseTimestamp(a.createdAt) - parseTimestamp(b.createdAt));
    });
    roots.sort((a, b)=>{
      const aPinned = parseTimestamp(a.pinnedAt);
      const bPinned = parseTimestamp(b.pinnedAt);
      if(aPinned !== bPinned) return bPinned - aPinned;
      return parseTimestamp(b.createdAt) - parseTimestamp(a.createdAt);
    });
    return roots;
  };

  const handleReply = (comment)=>{
    closeOpenActionsMenu();
    if(!comment) return;
    const key = comment?.id ? String(comment.id) : null;
    if(key) expandedReplies.add(key);
    setReplyTarget(comment);
    if(!commentTab?.classList.contains("is-open")){
      setCommentTabState(true, { animate: false });
    }
    setCommentFormExpanded(true, { focus: true });
    renderComments();
    commentForm?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const handlePin = async (comment, shouldPin)=>{
    if(!comment?.id) return;
    const postId = currentGame?.id ?? null;
    if(!postId) return;
    const token = localStorage.getItem("tgx_admin_token") || "";
    if(!token){ alert("Falta AUTH_TOKEN. Inicia sesión admin y pégalo."); return; }
    try{
      const updated = await commentsPin(comment.id, postId, shouldPin, token);
      if(updated){
        commentsState.items = commentsState.items.map(item => item?.id === updated.id ? { ...updated } : item);
        renderComments();
      }
    }catch(err){
      console.error("[comments] pin falló", err);
      setCommentStatus("No se pudo actualizar el comentario.", { kind: "error" });
      alert("No se pudo actualizar el comentario.");
    }
  };

  const handleDelete = async (comment)=>{
    closeOpenActionsMenu();
    const commentId = comment?.id ? String(comment.id) : null;
    const postId = currentGame?.id ?? null;
    if(!commentId || !postId) return;
    const confirmMessage = "¿Eliminar este comentario?";
    if(typeof window !== "undefined" && !window.confirm(confirmMessage)) return;
    const token = localStorage.getItem("tgx_admin_token") || "";
    if(!token){ alert("Falta AUTH_TOKEN. Inicia sesión admin y pégalo."); return; }
    try{
      await commentsDelete(commentId, postId, token);
      commentsState.items = commentsState.items.filter(item => item?.id !== commentId && item?.parentId !== commentId);
      expandedReplies.delete(commentId);
      if(comment?.parentId) expandedReplies.delete(String(comment.parentId));
      if(replyTargetId && (replyTargetId === commentId || replyTargetId === String(comment?.parentId))){
        setReplyTarget(null);
      }
      renderComments();
    }catch(err){
      console.error("[comments] eliminar falló", err);
      setCommentStatus("No se pudo eliminar el comentario.", { kind: "error" });
      alert("No se pudo eliminar el comentario.");
    }
  };

  const createActionsMenu = (comment, { isReply = false } = {})=>{
    const actions = [];
    if(!isReply){
      actions.push({ type: "reply", label: "Responder" });
    }
    if(isAdmin){
      if(!isReply){
        const isPinned = Boolean(comment?.pinnedAt);
        actions.push({ type: isPinned ? "unpin" : "pin", label: isPinned ? "Desfijar" : "Fijar arriba" });
      }
      actions.push({ type: "delete", label: "Eliminar" });
    }else if(isReply){
      return null;
    }
    if(!actions.length) return null;

    const wrap = document.createElement("div");
    wrap.className = "comment-actions";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "comment-actions-toggle";
    toggle.setAttribute("aria-haspopup", "menu");
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = "<span aria-hidden=\"true\">⋮</span>";
    toggle.title = "Más opciones";

    const menu = document.createElement("div");
    menu.className = "comment-actions-menu";
    menu.setAttribute("role", "menu");
    menu.hidden = true;

    actions.forEach(action => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "comment-actions-item";
      btn.textContent = action.label;
      btn.dataset.action = action.type;
      btn.addEventListener("click", ()=>{
        closeOpenActionsMenu();
        switch(action.type){
          case "reply":
            handleReply(comment);
            break;
          case "pin":
            handlePin(comment, true);
            break;
          case "unpin":
            handlePin(comment, false);
            break;
          case "delete":
            handleDelete(comment);
            break;
          default:
            break;
        }
      });
      menu.appendChild(btn);
    });

    toggle.addEventListener("click", (ev)=>{
      ev.preventDefault();
      ev.stopPropagation();
      if(openActionsMenu === menu){
        closeOpenActionsMenu();
      }else{
        closeOpenActionsMenu();
        menu.hidden = false;
        toggle.setAttribute("aria-expanded", "true");
        openActionsMenu = menu;
      }
    });

    wrap.append(toggle, menu);
    return wrap;
  };

  const createCommentElement = (comment, { isReply = false } = {})=>{
    const item = document.createElement("li");
    item.className = isReply ? "comment-reply" : "comment-item";
    if(comment?.id) item.dataset.commentId = String(comment.id);
    const role = comment?.role === "admin" ? "admin" : "user";
    item.dataset.role = role;
    if(role === "admin") item.classList.add("is-admin");
    if(!isReply && comment?.pinnedAt) item.classList.add("is-pinned");
    if(!isReply && replyTargetId && comment?.id === replyTargetId) item.classList.add("is-reply-target");

    const meta = document.createElement("div");
    meta.className = "comment-meta";
    if(isReply) meta.classList.add("comment-meta--compact");

    const author = document.createElement("div");
    author.className = "comment-author";
    if(isReply) author.classList.add("comment-author--compact");

    const alias = document.createElement("span");
    alias.className = "comment-alias";
    if(role === "admin") alias.classList.add("is-admin");
    alias.textContent = comment?.alias || "Anónimo";
    author.appendChild(alias);

    if(role === "admin"){
      const badge = document.createElement("span");
      badge.className = "comment-role-badge";
      badge.textContent = "Admin";
      author.appendChild(badge);
    }

    if(!isReply && comment?.pinnedAt){
      const pinnedBadge = document.createElement("span");
      pinnedBadge.className = "comment-pinned-badge";
      pinnedBadge.textContent = "Fijado";
      author.appendChild(pinnedBadge);
    }

    const actions = document.createElement("div");
    actions.className = "comment-meta-actions";

    const time = document.createElement("time");
    time.className = "comment-date";
    if(comment?.createdAt) time.dateTime = comment.createdAt;
    time.textContent = formatCommentDate(comment?.createdAt || Date.now());
    actions.appendChild(time);

    const actionsMenu = createActionsMenu(comment, { isReply });
    if(actionsMenu) actions.appendChild(actionsMenu);

    meta.append(author, actions);

    const body = document.createElement("p");
    body.className = "comment-message";
    if(isReply) body.classList.add("comment-message--reply");
    body.textContent = comment?.message || "";

    item.append(meta, body);

    if(!isReply){
      const thread = createRepliesThread(comment);
      if(thread) item.appendChild(thread);
    }

    return item;
  };

  const createRepliesThread = (comment)=>{
    const replies = Array.isArray(comment?.replies) ? comment.replies : [];
    if(!replies.length) return null;
    const thread = document.createElement("div");
    thread.className = "comment-thread";

    const line = document.createElement("div");
    line.className = "comment-thread-line";
    line.setAttribute("aria-hidden", "true");
    thread.appendChild(line);

    const body = document.createElement("div");
    body.className = "comment-thread-body";

    const list = document.createElement("ul");
    list.className = "comment-replies";

    const commentKey = comment?.id ? String(comment.id) : null;
    const isExpanded = commentKey ? expandedReplies.has(commentKey) : false;
    const visibleCount = isExpanded ? replies.length : Math.min(1, replies.length);

    replies.forEach((reply, index)=>{
      const replyEl = createCommentElement(reply, { isReply: true });
      if(!isExpanded && index >= visibleCount){
        replyEl.classList.add("is-collapsed");
        replyEl.hidden = true;
      }
      list.appendChild(replyEl);
    });

    body.appendChild(list);

    if(!isExpanded && replies.length > visibleCount){
      const remaining = replies.length - visibleCount;
      const moreBtn = document.createElement("button");
      moreBtn.type = "button";
      moreBtn.className = "comment-more-replies";
      moreBtn.textContent = remaining === 1 ? "Ver 1 respuesta más" : `Ver ${remaining} respuestas más`;
      moreBtn.addEventListener("click", ()=>{
        if(commentKey) expandedReplies.add(commentKey);
        renderComments();
      });
      body.appendChild(moreBtn);
    }

    thread.appendChild(body);
    return thread;
  };

  function renderComments(){
    const items = Array.isArray(commentsState.items) ? commentsState.items : [];
    const total = items.length;
    updateCommentCounters(total);

    if(!commentList || !commentEmpty){
      if(commentsState.loading){
        setCommentStatus("Cargando comentarios…", { kind: "loading" });
      }else if(commentsState.error){
        setCommentStatus("No se pudieron cargar los comentarios.", { kind: "error", showRetry: true });
      }else{
        setCommentStatus(null);
      }
      return;
    }

    closeOpenActionsMenu();
    commentList.innerHTML = "";

    if(commentsState.loading){
      setCommentStatus("Cargando comentarios…", { kind: "loading" });
      commentEmpty.hidden = true;
      commentList.hidden = true;
      return;
    }

    if(commentsState.error){
      setCommentStatus("No se pudieron cargar los comentarios.", { kind: "error", showRetry: true });
      commentEmpty.hidden = true;
      commentList.hidden = true;
      return;
    }

    setCommentStatus(null);

    if(!items.length){
      commentEmpty.hidden = false;
      commentList.hidden = true;
      return;
    }

    commentEmpty.hidden = true;
    commentList.hidden = false;

    const threads = buildCommentTree(items);
    threads.forEach(comment => {
      const node = createCommentElement(comment);
      commentList.appendChild(node);
    });

    requestAnimationFrame(()=>{
      if(!commentList) return;
      commentList.querySelectorAll(".is-highlighted").forEach(el => el.classList.remove("is-highlighted"));
      if(!highlightCommentId) return;
      const target = commentList.querySelector(`[data-comment-id="${highlightCommentId}"]`);
      if(target){
        target.classList.add("is-highlighted");
        if(highlightPendingScroll){
          highlightPendingScroll = false;
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    });
  }

  const loadComments = async ({ force = false } = {})=>{
    const postId = currentGame?.id ?? null;
    if(!postId){
      commentsState = { items: [], loading: false, error: null };
      lastLoadedPostId = null;
      expandedReplies.clear();
      setReplyTarget(null);
      renderComments();
      return;
    }
    if(commentsState.loading) return;
    if(!force && lastLoadedPostId === postId && commentsState.items.length){
      return;
    }
    if(lastLoadedPostId !== postId){
      expandedReplies.clear();
      setReplyTarget(null);
    }
    commentsState.loading = true;
    commentsState.error = null;
    renderComments();
    try{
      const list = await commentsList(postId, { force });
      commentsState.items = Array.isArray(list) ? list : [];
      commentsState.error = null;
      lastLoadedPostId = postId;
    }catch(err){
      console.error("[comments] carga falló", err);
      commentsState.error = err;
    }finally{
      commentsState.loading = false;
      renderComments();
    }
  };
  const setCommentTabState = (open, { animate = true } = {})=>{
    if(!commentTab || !commentToggle || !commentFormWrap) return;
    const isOpen = Boolean(open);
    const shouldAnimate = animate && commentTabOpenState !== isOpen;
    commentTab.dataset.open = String(isOpen);
    commentToggle.setAttribute("aria-expanded", String(isOpen));
    commentTab.classList.toggle("is-open", isOpen);
    commentTabBody?.setAttribute("aria-hidden", String(!isOpen));
    commentFormWrap.setAttribute("aria-hidden", String(!isOpen));
    if(isOpen){
      if(shouldAnimate){
        setCommentTabHeaderState(false);
        setCommentTabHeaderState(true, 320);
      }else{
        setCommentTabHeaderState(true);
      }
      setCommentFormExpanded(commentFormExpanded);
    }else{
      setCommentTabHeaderState(false);
      setCommentFormExpanded(false);
    }
    if(shouldAnimate) triggerCommentTabAnimation(isOpen);
    commentTabOpenState = isOpen;
    updateCommentLayout();
  };
  setCommentTabState(false, { animate: false });
  commentToggle?.addEventListener("click", ()=>{
    const isOpen = commentTab?.classList.contains("is-open");
    const nextOpenState = !isOpen;
    setCommentTabState(nextOpenState);
    if(nextOpenState){
      if(commentsState.error){
        loadComments({ force: true });
      }else if(!commentsState.items.length && !commentsState.loading){
        loadComments();
      }
      if(commentFormExpanded){
        focusCommentTextarea();
      }else{
        focusCommentToggle();
      }
    }
  });
  commentRetry?.addEventListener("click", ()=>{
    if(commentsState.loading) return;
    loadComments({ force: true });
  });
  commentForm?.addEventListener("submit", async (ev)=>{
    ev.preventDefault();
    const postId = currentGame?.id ?? null;
    if(!postId){
      alert("No se pudo asociar el comentario a la publicación.");
      return;
    }
    const formData = new FormData(commentForm);
    const message = String(formData.get("comment") || "").trim();
    if(message.length === 0){
      const textarea = commentForm.querySelector("textarea[name='comment']");
      textarea?.focus();
      return;
    }
    const aliasValue = String(formData.get("alias") || "").trim() || "Anónimo";
    const emailValue = String(formData.get("email") || "").trim();
    if(commentSubmitButton) commentSubmitButton.disabled = true;
    try{
      const token = isAdmin ? (localStorage.getItem("tgx_admin_token") || "") : "";
      const parentId = replyTargetId ? String(replyTargetId) : undefined;
      const created = await commentsCreate(postId, { alias: aliasValue, email: emailValue, message, token, parentId });
      if(created){
        commentsState.items = [...commentsState.items, created];
        commentsState.error = null;
        lastLoadedPostId = postId;
        if(created.parentId){
          expandedReplies.add(String(created.parentId));
        }
        renderComments();
        commentForm.reset();
        setReplyTarget(null);
      }
    }catch(err){
      console.error("[comments] crear falló", err);
      setCommentStatus("No se pudo publicar el comentario. Inténtalo nuevamente.", { kind: "error" });
      alert("No se pudo publicar el comentario. Inténtalo nuevamente.");
    }finally{
      if(commentSubmitButton) commentSubmitButton.disabled = false;
    }
  });
  const showLoading = (message = "Cargando…")=> setModalDescription(modalDesc, `<p class="modal-status modal-status--loading">${message}</p>`, currentGame);
  const showError = (message = "No se pudo cargar la información adicional. Intenta nuevamente.")=> setModalDescription(modalDesc, `<p class="modal-status modal-status--error">${message}</p>`, currentGame);
  const update = (data = {})=>{
    const previousId = currentGame?.id ?? null;
    currentGame = { ...currentGame, ...data };
    const nextId = currentGame?.id ?? null;
    applyTitle();
    renderDescription();
    if(nextId !== previousId){
      commentsState = { items: [], loading: false, error: null };
      lastLoadedPostId = null;
      renderComments();
      if(nextId){
        loadComments({ force: true });
      }else{
        setCommentStatus(null);
      }
    }else{
      renderComments();
    }
    return currentGame;
  };

  applyTitle();
  if(initialState === "loading"){
    showLoading(initialMessage || "Cargando…");
  }else if(initialState === "error"){
    showError(initialMessage || "No se pudo cargar la información adicional.");
  }else{
    renderDescription();
  }
  renderComments();
  loadComments({ force: true });

  const openComments = ({ focus = false, highlightId = null, highlightParentId = null } = {})=>{
    setCommentTabState(true, { animate: false });
    if(highlightId){
      setHighlightTarget(highlightId, highlightParentId);
      renderComments();
    }
    loadComments({ force: true });
    if(focus){
      if(commentFormExpanded){
        focusCommentTextarea();
      }else{
        focusCommentToggle();
      }
    }
  };

  if(isAdmin){
    const kebabBtn=document.createElement("button");
    kebabBtn.className="tw-modal-menu";
    kebabBtn.setAttribute("aria-label","Opciones de publicación");
    kebabBtn.textContent="⋮";

    const panel=document.createElement("div");
    panel.className="tw-kebab-panel";
    panel.innerHTML=`
      <button class="tw-kebab-item" data-action="edit">Editar</button>
      <button class="tw-kebab-item danger" data-action="delete">Eliminar</button>
    `;

    kebabBtn.addEventListener("click",(e)=>{ e.stopPropagation(); panel.classList.toggle("show"); });
    document.addEventListener("click",(e)=>{ if(!panel.contains(e.target) && e.target!==kebabBtn) panel.classList.remove("show"); });

    panel.addEventListener("click",(e)=>{
      const action=e.target?.dataset?.action;
      if(action==="edit"){ panel.classList.remove("show"); openEditGame(currentGame); }
      if(action==="delete"){
        panel.classList.remove("show");
        if(confirm("¿Eliminar esta publicación?")) deleteGame(currentGame);
      }
    });

    if(modalContent){
      modalContent.appendChild(kebabBtn);
      modalContent.appendChild(panel);
    }
  }

  const removeTrap = trapFocus(modalNode);
  const handleResize = ()=> updateCommentLayout();
  const cleanupModal = ()=>{
    if(typeof window !== "undefined"){
      window.removeEventListener("resize", handleResize);
    }
  };
  const performClose = ()=>{
    cleanupModal();
    closeModal(modalNode, removeTrap, onEscape);
  };
  const onEscape   = (e)=>{
    if(e.key!=="Escape") return;
    performClose();
  };
  if(typeof window !== "undefined"){
    window.addEventListener("resize", handleResize);
    const scheduleLayout = ()=>{
      const run = ()=> updateCommentLayout();
      if(typeof window.requestAnimationFrame === "function"){
        window.requestAnimationFrame(()=>{
          run();
          window.requestAnimationFrame(run);
        });
      }else{
        setTimeout(()=>{ run(); setTimeout(run, 50); }, 0);
      }
    };
    scheduleLayout();
  }
  if(modalClose) modalClose.addEventListener("click", ()=> performClose());
  openModalFragment(modalNode);

  const discord = socials.find(s => /discord/i.test(s.name || s.url));
  if(discord && modalContent){
    const ctaWrap = document.createElement("div");
    ctaWrap.className = "discord-cta";

    const link = document.createElement("a");
    link.className = "discord-link";
    link.href = "https://discord.gg/W9jp7wryD8";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const img = document.createElement("img");
    img.src = discord.image;
    img.alt = discord.name || "Discord";
    link.appendChild(img);
    ctaWrap.appendChild(link);

    const bubble = document.createElement("div");
    bubble.className = "discord-bubble";
    bubble.textContent = "Preguntas?🤨 pásate por el Discord";
    ctaWrap.appendChild(bubble);

    modalContent.appendChild(ctaWrap);

    requestAnimationFrame(()=>{
      bubble.classList.add("show");
      const hide = ()=> bubble.classList.remove("show");
      const t = setTimeout(hide, 5000);
      link.addEventListener("mouseenter", ()=>{ hide(); clearTimeout(t); });
    });
  }
  return { update, showLoading, showError, openComments, get data(){ return currentGame; } };
}
function deleteGame(game){
  if(!game.id){ alert("No se encontró ID."); return; }
  const token = localStorage.getItem("tgx_admin_token") || "";
  if(!token){ alert("Falta AUTH_TOKEN. Inicia sesión admin y pégalo."); return; }
  apiDelete(game.id, token)
    .then(()=> reloadData())
    .then(()=> alert("Publicación eliminada."))
    .catch(e=>{ console.error(e); alert("Error al borrar."); });
}

/* =========================
   Selector de categoría
   ========================= */
function makeCategorySelect(current="game"){
  const wrap=document.createElement("label");
  wrap.style.display="block";
  wrap.style.marginTop=".6rem";
  wrap.innerHTML=`
    <span style="display:block;font-size:.85rem;opacity:.8;margin-bottom:.25rem">Tipo</span>
    <select class="cat-select" style="width:100%;background:#11161b;border:1px solid #2a323a;border-radius:10px;padding:.6rem .7rem;color:#cfe3ff">
      <option value="game">Juego</option>
      <option value="app">App</option>
      <option value="movie">Película</option>
    </select>
  `;
  wrap.querySelector("select").value = current || "game";
  return wrap;
}

/* =========================
   Nuevo / Editar (genera thumb + link_ok)
   ========================= */
function initGameModal(initial = {}){
  const fragment = newGameModalTemplate.content.cloneNode(true);
  const node  = fragment.querySelector(".tw-modal");
  const form  = fragment.querySelector(".new-game-form");
  const titleInput = fragment.querySelector(".new-game-title");
  const imageInput = fragment.querySelector(".new-game-image-file");
  const trailerFileInput = fragment.querySelector(".new-game-trailer-file");
  const trailerUrlInput  = fragment.querySelector(".new-game-trailer-url");
  const modalClose = fragment.querySelector(".tw-modal-close");
  const playerModeField = fragment.querySelector(".player-mode-field");
  const playerModeSelect = fragment.querySelector(".player-mode-select");

  const editorRoot = fragment.querySelector(".rich-editor");
  const editorAPI  = initRichEditor(editorRoot);

  const catSel = makeCategorySelect(initial.category || "game");
  form.querySelector(".new-game-title")?.parentElement?.appendChild(catSel);

  const catSelectEl = catSel.querySelector(".cat-select");

  let lastPlayerModeValue = initial.playerMode || playerModeSelect?.value || "single";
  if(playerModeSelect){
    if(playerModeSelect.querySelector(`option[value="${lastPlayerModeValue}"]`)){
      playerModeSelect.value = lastPlayerModeValue;
    }else if(playerModeSelect.options.length){
      playerModeSelect.value = playerModeSelect.options[0].value;
      lastPlayerModeValue = playerModeSelect.value;
    }
    playerModeSelect.addEventListener("change", (e)=>{
      lastPlayerModeValue = e.target.value;
    });
  }

  const updatePlayerModeVisibility = (catValue)=>{
    if(!playerModeField) return;
    const isGame = catValue === "game";
    if(isGame){
      playerModeField.hidden = false;
      playerModeField.setAttribute("aria-hidden", "false");
      if(playerModeSelect){
        playerModeSelect.disabled = false;
        const option = playerModeSelect.querySelector(`option[value="${lastPlayerModeValue}"]`);
        if(option){
          playerModeSelect.value = lastPlayerModeValue;
        }else if(playerModeSelect.options.length){
          playerModeSelect.value = playerModeSelect.options[0].value;
          lastPlayerModeValue = playerModeSelect.value;
        }
      }
    }else{
      if(playerModeSelect){
        lastPlayerModeValue = playerModeSelect.value || lastPlayerModeValue;
        playerModeSelect.value = "";
        playerModeSelect.disabled = true;
      }
      playerModeField.hidden = true;
      playerModeField.setAttribute("aria-hidden", "true");
    }
  };

  catSelectEl?.addEventListener("change", (e)=> updatePlayerModeVisibility(e.target.value));

  updatePlayerModeVisibility(catSelectEl?.value || "game");

  if(trailerUrlInput){
    trailerUrlInput.value=""; trailerUrlInput.disabled=true;
    const label=trailerUrlInput.closest("label"); if(label) label.style.display="none";
  }

  if(titleInput) titleInput.value = initial.title || "";
  if(initial.description) editorAPI.setHTML(initial.description);
  if(imageInput && initial.image !== undefined) imageInput.required=false;

  return { node, form, titleInput, imageInput, trailerFileInput, modalClose, editorAPI, catSel, playerModeField, playerModeSelect };
}

async function compressCoverAndThumb(imageFile){
  const cover = await compressImage(imageFile, { maxW: 960, maxH: 960, quality: 0.78, mime: "image/webp" });
  const thumb = await compressImage(imageFile, { maxW: 320, maxH: 320, quality: 0.7, mime: "image/webp" });
  return { cover, thumb };
}

async function readTrailerFile(trailerFile){
  if(!/^video\/(mp4|webm)$/i.test(trailerFile.type)){ alert("El trailer debe ser MP4 o WEBM."); return null; }
  if(trailerFile.size > 6*1024*1024){ alert("Trailer >6MB. Usa uno más ligero."); return null; }
  try{ return await readAsDataURL(trailerFile); }
  catch(err){ console.error("[trailer read]", err); alert("No se pudo leer el trailer."); return null; }
}

async function gatherGameData(refs, { requireImage=true } = {}){
  const { titleInput, imageInput, trailerFileInput, editorAPI, catSel, playerModeSelect } = refs;

  const title=(titleInput?.value||"").trim();
  const descHTML=editorAPI.getHTML();
  const imageFile=imageInput?.files?.[0] || null;
  const trailerFile=trailerFileInput?.files?.[0] || null;
  const category = catSel.querySelector(".cat-select")?.value || "game";
  const rawPlayerMode = playerModeSelect && !playerModeSelect.disabled ? playerModeSelect.value || "" : "";
  const playerMode = category === "game" && rawPlayerMode ? rawPlayerMode : null;

  if(!title){ alert("Título es obligatorio."); titleInput?.focus?.(); return null; }
  if(requireImage && !imageFile){ alert("Selecciona una imagen de portada."); imageInput?.focus?.(); return null; }
  if(!descHTML || !descHTML.replace(/<[^>]*>/g,'').trim()){ alert("Escribe una descripción."); return null; }

  let coverDataUrl, thumbDataUrl;
  if(imageFile){
    try{
      ({ cover: coverDataUrl, thumb: thumbDataUrl } = await compressCoverAndThumb(imageFile));
    }catch(err){ console.error("[cover compress]", err); alert("No se pudo compactar la portada."); return null; }
  }

  let previewSrc=null;
  if(trailerFile){
    previewSrc = await readTrailerFile(trailerFile);
    if(!previewSrc) return null;
  }

  const first_link = extractFirstLink(descHTML);
  const plat = platformFromUrl(first_link || "");
  const gofile_id = plat === "gofile" ? extractGofileId(first_link) : null;
  const drive_id = plat === "drive" ? extractDriveId(first_link) : null;
  const link_ok = first_link ? await fetchLinkOk(first_link) : null;

  return { title, descHTML, coverDataUrl, thumbDataUrl, previewSrc, category, playerMode, first_link, link_ok, gofile_id, drive_id };
}

function openNewGameModal(){
  const refs = initGameModal();
  const { node, form, titleInput, imageInput, trailerFileInput, modalClose, editorAPI, catSel, playerModeSelect, playerModeField } = refs;

  const removeTrap=trapFocus(node);
  const onEscape=(e)=>{ if(e.key==="Escape") closeModal(node, removeTrap, onEscape); };
  modalClose.addEventListener("click", ()=> closeModal(node, removeTrap, onEscape));

  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const data = await gatherGameData(refs);
    if(!data) return;

    const token=localStorage.getItem("tgx_admin_token")||"";
    if(!token){ alert("Falta AUTH_TOKEN. Inicia sesión admin y pégalo."); return; }

    const newGame = {
      title: data.title,
      image: data.coverDataUrl,
      image_thumb: data.thumbDataUrl,
      description: data.descHTML,
      previewVideo: data.previewSrc,
      category: data.category,
      playerMode: data.playerMode,
      first_link: data.first_link,
      link_ok: data.link_ok,
      gofile_id: data.gofile_id,
      drive_id: data.drive_id
    };

    try{
      await apiCreate(newGame, token);
      await reloadData();
      closeModal(node, removeTrap, onEscape);
      alert("¡Publicación publicada!");
    }catch(err){ console.error("[create error]", err); alert("Error al crear. Revisa consola."); }
  });

  openModalFragment(node);
}
function openEditGame(original){
  const refs = initGameModal(original);
  const { node, form, titleInput, imageInput, trailerFileInput, modalClose, editorAPI, catSel, playerModeSelect, playerModeField  } = refs;

  let clearTrailerCb=null;
  {
    const trailerGroup = trailerFileInput?.closest("label")?.parentElement || form;
    const clearWrap=document.createElement("label");
    clearWrap.style.display="inline-flex"; clearWrap.style.alignItems="center"; clearWrap.style.gap=".4rem"; clearWrap.style.margin=".4rem 0 0";
    clearWrap.innerHTML=`<input type="checkbox" class="clear-trailer"> Quitar trailer`;
    trailerGroup.appendChild(clearWrap);
    clearTrailerCb = clearWrap.querySelector(".clear-trailer");
  }

  const removeTrap=trapFocus(node);
  const onEscape=(e)=>{ if(e.key==="Escape") closeModal(node, removeTrap, onEscape); };

  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const data = await gatherGameData(refs, { requireImage: false });
    if(!data) return;

    const patch={ title: data.title, description: data.descHTML, category: data.category, playerMode: data.playerMode, first_link: data.first_link, link_ok: data.link_ok, gofile_id: data.gofile_id, drive_id: data.drive_id };

    if(data.coverDataUrl){
      patch.image = data.coverDataUrl;
      patch.image_thumb = data.thumbDataUrl;
    }
    if(clearTrailerCb?.checked){
      patch.previewVideo=null;
    }else if(data.previewSrc){
      patch.previewVideo = data.previewSrc;
    }
    patch.bump = true;

    const token=localStorage.getItem("tgx_admin_token")||"";
    if(!token){ alert("Falta AUTH_TOKEN. Inicia sesión admin y pégalo."); return; }

    try{
      await apiUpdate(original.id, patch, token);
      page = 1;
      await reloadData();
      closeModal(node, removeTrap, onEscape);
      alert("¡Publicación actualizada!");
    }catch(err){ console.error(err); alert("Error al actualizar. Revisa consola."); }
  });

  modalClose.addEventListener("click", ()=> closeModal(node, removeTrap, onEscape));
  openModalFragment(node);
}

/* =========================
   Social bar
   ========================= */
function openNewSocialModal(){
  const modal = newSocialModalTemplate.content.cloneNode(true);
  const node  = modal.querySelector(".tw-modal");
  const form  = modal.querySelector(".new-social-form");
  const imageInput = modal.querySelector(".new-social-image-file");
  const urlInput   = modal.querySelector(".new-social-url");
  const nameInput  = modal.querySelector(".new-social-name");
  const modalClose = modal.querySelector(".tw-modal-close");

  const removeTrap=trapFocus(node);
  const onEscape=(e)=>{ if(e.key==="Escape") closeModal(node, removeTrap, onEscape); };

  form.addEventListener("submit",(e)=>{
    e.preventDefault();
    const file=imageInput?.files?.[0];
    const url=(urlInput.value||"").trim();
    const name=(nameInput?.value||"").trim() || null;
    if(!file){ alert("Selecciona una imagen."); return; }
    if(!url){ alert("Coloca el enlace de la red."); urlInput.focus(); return; }

    const reader=new FileReader();
    reader.onload = async ()=>{
      try{
        const token=localStorage.getItem("tgx_admin_token")||"";
        await socialsCreate({ name, image: reader.result, url }, token);
        socials = await socialsList({ force: true });
        renderSocialBar();
      }catch(err){ console.error(err); alert("Error al guardar red social."); }
      closeModal(node, removeTrap, onEscape);
    };
    reader.readAsDataURL(file);
  });

  modalClose.addEventListener("click", ()=> closeModal(node, removeTrap, onEscape));
  openModalFragment(node);
}
function renderSocialBar(){
  const bar=document.querySelector(".social-bar");
  if(!bar) return;
  bar.innerHTML="";
  socials.forEach((s)=>{
    const wrap=document.createElement("div");
    wrap.className="social-tile-wrap"; wrap.style.position="relative"; wrap.style.display="inline-block";
    const a=document.createElement("a"); a.href=s.url; a.target="_blank"; a.rel="noopener";
    const tile=document.createElement("div"); tile.className="social-tile";
    const img=document.createElement("img"); img.src=s.image; img.className="social-img";
    tile.appendChild(img); a.appendChild(tile); wrap.appendChild(a);
    if(isAdmin && s.id){
      const del=document.createElement("button");
      del.textContent="×"; del.title="Eliminar"; del.className="social-del";
      del.addEventListener("click", async(e)=>{
        e.preventDefault(); e.stopPropagation();
        if(!confirm("¿Eliminar esta red social?")) return;
        try{ const token=localStorage.getItem("tgx_admin_token")||""; await socialsDelete(s.id, token); socials=await socialsList({ force: true }); renderSocialBar(); }
        catch(err){ console.error(err); alert("No se pudo eliminar."); }
      });
      wrap.appendChild(del);
    }
    bar.appendChild(wrap);
  });
  if(isAdmin){
    const btn=document.createElement("button");
    btn.className="add-social-tile"; btn.textContent="+";
    btn.addEventListener("click", openNewSocialModal);
    bar.appendChild(btn);
  }
}

/* =========================
   DMCA Modal
   ========================= */
function openDmcaModal(){
  const modal = dmcaModalTemplate.content.cloneNode(true);
  const node  = modal.querySelector('.tw-modal');
  const desc  = modal.querySelector('.tw-modal-description');
  const btnToggle = modal.querySelector('.dmca-lang-toggle');
  const modalClose = modal.querySelector('.tw-modal-close');

  let current = 'es';
  if(desc) desc.innerHTML = dmcaTexts[current];
  if(btnToggle) btnToggle.textContent = 'EN';

  btnToggle?.addEventListener('click', ()=>{
    current = current === 'es' ? 'en' : 'es';
    if(desc) desc.innerHTML = dmcaTexts[current];
    if(btnToggle) btnToggle.textContent = current === 'es' ? 'EN' : 'ES';
  });

  const removeTrap = trapFocus(node);
  const onEscape = (e)=>{ if(e.key==='Escape') closeModal(node, removeTrap, onEscape); };
  modalClose?.addEventListener('click', ()=> closeModal(node, removeTrap, onEscape));

  openModalFragment(node);
}

/* =========================
   FAQ Modal
   ========================= */
function openFaqModal(){
  const modal = faqModalTemplate.content.cloneNode(true);
  const node  = modal.querySelector('.tw-modal');
  const content = modal.querySelector('.faq-content');
  const modalClose = modal.querySelector('.tw-modal-close');

  if(content) content.textContent = 'Cargando…';

  if(isAdmin){
    const editBtn = document.createElement('button');
    editBtn.className = 'dmca-btn';
    editBtn.type = 'button';
    editBtn.textContent = 'Editar';
    editBtn.addEventListener('click', openFaqEditor);
    modal.querySelector('.tw-modal-content')?.appendChild(editBtn);
  }

  const removeTrap = trapFocus(node);
  const onEscape = (e)=>{ if(e.key==='Escape') closeModal(node, removeTrap, onEscape); };
  modalClose?.addEventListener('click', ()=> closeModal(node, removeTrap, onEscape));

  openModalFragment(node);

  (async ()=>{
    try{
      const res = await fetch('/.netlify/functions/faq');
      if(res.ok){
        const data = await res.json();
        if(content) content.innerHTML = data.content || '';
      }else{
        if(content) content.textContent = 'No se pudo cargar.';
      }
    }catch(err){
      console.error(err);
      if(content) content.textContent = 'No se pudo cargar.';
    }
  })();
}

async function openFaqEditor(){
  const tpl=document.createElement('template');
  tpl.innerHTML=`
    <div class="tw-modal" role="dialog" aria-label="Editar FAQ">
      <div class="tw-modal-content">
        <button class="tw-modal-close" aria-label="Cerrar">×</button>
        <h2>Editar FAQ</h2>
        <div class="rich-editor">
          <div class="rich-toolbar" role="toolbar" aria-label="Editor de texto">
            <button type="button" class="rtb-btn" data-cmd="bold"><b>B</b></button>
            <button type="button" class="rtb-btn" data-cmd="italic"><i>I</i></button>
            <button type="button" class="rtb-btn" data-cmd="underline"><u>U</u></button>
            <span class="rtb-sep"></span>
            <button type="button" class="rtb-btn" data-block="h2">H2</button>
            <button type="button" class="rtb-btn" data-block="p">P</button>
            <span class="rtb-sep"></span>
            <label class="rtb-inline">
              Fuente
              <select class="rtb-font">
                <option value="">Sistema</option>
                <option value="Segoe UI">Segoe UI</option>
                <option value="Roboto">Roboto</option>
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
              </select>
            </label>
            <span class="rtb-sep"></span>
            <button type="button" class="rtb-btn" data-list="ul">• Lista</button>
            <span class="rtb-sep"></span>
            <button type="button" class="rtb-btn rtb-link">🔗 Enlace</button>
            <button type="button" class="rtb-btn rtb-color">🎨 Color</button>
            <input type="color" class="rtb-color-input" value="#cfe3ff" hidden />
          </div>
          <div class="editor-area" contenteditable="true" aria-label="FAQ contenido"></div>
        </div>
        <button class="dmca-btn faq-save-btn" type="button">Guardar</button>
      </div>
    </div>`;

  const frag = tpl.content.cloneNode(true);
  const node = frag.querySelector('.tw-modal');
  const modalClose = frag.querySelector('.tw-modal-close');
  const saveBtn = frag.querySelector('.faq-save-btn');
  const editorRoot = frag.querySelector('.rich-editor');
  const editorAPI = initRichEditor(editorRoot);
  const contentEl = document.querySelector('.faq-content');
  if(contentEl) editorAPI.setHTML(contentEl.innerHTML);

  saveBtn?.addEventListener('click', async ()=>{
    const content = editorAPI.getHTML();
    try{
      const token=localStorage.getItem('tgx_admin_token')||'';
      const res = await fetch('/.netlify/functions/faq', {
        method:'PUT',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
        body:JSON.stringify({content})
      });
      if(res.ok){
        if(contentEl) contentEl.innerHTML = content;
        closeModal(node, removeTrap, onEscape);
      }else{
        alert('No se pudo guardar.');
      }
    }catch(err){
      console.error(err);
      alert('No se pudo guardar.');
    }
  });

  const removeTrap = trapFocus(node);
  const onEscape = (e)=>{ if(e.key==='Escape') closeModal(node, removeTrap, onEscape); };
  modalClose?.addEventListener('click', ()=> closeModal(node, removeTrap, onEscape));

  openModalFragment(node);
}

/* =========================
   Búsqueda + SideNav
   ========================= */
function setupSearch(){
  const input=document.getElementById("searchInput");
  if(!input) return;
  input.addEventListener("input", ()=>{
    searchQuery = input.value.trim();
    page = 1;
    renderRow();
  });
}

function setupDmcaButton(){
  const btn=document.querySelector('.dmca-btn:not(.faq-btn)');
  if(!btn) return;
  btn.addEventListener('click', ()=>{
    openDmcaModal();
  });
}

function setupFaqButton(){
  const btn=document.querySelector('.faq-btn');
  if(!btn) return;
  btn.addEventListener('click', ()=>{
    openFaqModal();
  });
}
function setupSideNav(){
  const btns = Array.from(document.querySelectorAll('.side-nav .nav-btn'));
  if(!btns.length) return;

  function setActive(cat){
    btns.forEach(b=> b.classList.toggle("active", (b.dataset.cat||"game")===cat));
    updateTopbarLogo(cat);
  }

  btns.forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const cat = btn.dataset.cat || "game";
      if(window.currentCategory === cat) return;
      window.currentCategory = cat;
      setActive(cat);
      try{
        const data = await apiList(cat);
        recientes = Array.isArray(data)?data:[];
        page = 1;
        renderRow();
        renderHeroCarousel();
      }catch(e){ console.error("[nav]", e); }
    });
  });

  setActive(window.currentCategory || "game");
}

/* =========================
   Admin: Token y Login / Crear Usuario
   ========================= */
function ensureAuthTokenPrompt(){
  try{
    const k="tgx_admin_token"; let t=localStorage.getItem(k);
    if(!t){ t = prompt("Pega tu AUTH_TOKEN de Netlify (requerido para publicar/editar/borrar):"); if(t) localStorage.setItem(k, t.trim()); }
  }catch (err) {}
}

function openAdminLoginModal(){
  const modal = adminLoginModalTemplate.content.cloneNode(true);
  const node  = modal.querySelector(".tw-modal");
  const form  = modal.querySelector(".admin-login-form");
  const h2    = modal.querySelector(".tw-modal-title") || modal.querySelector("h2");
  const usernameInput = modal.querySelector(".admin-username");
  const pinInput      = modal.querySelector(".admin-pin");
  const submitBtn     = form.querySelector('button[type="submit"]');
  const modalClose    = modal.querySelector(".tw-modal-close");

  const imgDecor = node.querySelector(".tw-modal-image"); if (imgDecor) imgDecor.style.display = "none";

  const accessWrap = document.createElement("label");
  accessWrap.innerHTML = `Llave de acceso <input type="password" class="admin-access" required>
    <span class="input-hint">Se valida contra el servidor y puede revocarse</span>`;
  form.insertBefore(accessWrap, form.querySelector(".tw-modal-actions") || form.lastElementChild);

  const actions = form.querySelector(".tw-modal-actions") || form;
  const createBtn = document.createElement("button");
  createBtn.type = "button";
  createBtn.className = "tw-btn-secondary is-gradient";
  createBtn.textContent = "Crear usuario";
  actions.appendChild(createBtn);

  const confirmWrap = document.createElement("label");
  confirmWrap.style.display = "none";
  confirmWrap.innerHTML = `Confirmar PIN <input type="password" class="admin-pin2">
    <span class="input-hint">4 a 6 dígitos</span>`;
  form.insertBefore(confirmWrap, actions);

  const savedHash = localStorage.getItem(LS_ADMIN_HASH);
  const savedSalt = localStorage.getItem(LS_ADMIN_SALT);
  const savedUser = localStorage.getItem(LS_ADMIN_USER);

  const isCreateMode = { value: false };
  function setModeCreate(flag){
    isCreateMode.value = !!flag;
    confirmWrap.style.display = flag ? "block" : "none";
    if (h2) h2.textContent = flag ? "Crear usuario administrador" : "Entrar como administrador";
    if (submitBtn) submitBtn.textContent = flag ? "Crear y entrar" : "Entrar";
  }
  if (!savedHash || !savedSalt || !savedUser) setModeCreate(true);
  createBtn.addEventListener("click", ()=> setModeCreate(!isCreateMode.value));

  const removeTrap=trapFocus(node);
  const onEscape=(e)=>{ if(e.key==="Escape") closeModal(node, removeTrap, onEscape); };
  modalClose.addEventListener("click", ()=> closeModal(node, removeTrap, onEscape));

  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const user=(usernameInput.value||"").trim();
    const pin =(pinInput.value||"").trim();
    const accessPlain = node.querySelector(".admin-access")?.value?.trim();
    if(!user || !pin || !accessPlain){ alert("Usuario, PIN y Llave son obligatorios."); return; }
    if(!/^[0-9]{4,6}$/.test(pin)){ alert("PIN debe ser 4 a 6 dígitos."); return; }

    const accessHash = await sha256(accessPlain);
    const res = await adminLoginByKeyHash(accessHash);
    if(!res?.ok){ alert("Llave inválida o revocada."); return; }

    if(isCreateMode.value){
      const pin2 = node.querySelector(".admin-pin2")?.value?.trim();
      if(pin!==pin2){ alert("Los PIN no coinciden."); return; }
      const salt=genSaltHex(16);
      const hash=await hashCreds(user,pin,salt);
      try{
        localStorage.setItem(LS_ADMIN_HASH,hash);
        localStorage.setItem(LS_ADMIN_SALT,salt);
        localStorage.setItem(LS_ADMIN_USER,user);
      }catch (err) {}
    } else {
      if(user!==savedUser){ alert("Usuario o PIN incorrectos."); return; }
      const hash=await hashCreds(user,pin,savedSalt);
      if(hash!==savedHash){ alert("Usuario o PIN incorrectos."); return; }
    }

    isAdmin=true; persistAdmin(true);
    closeModal(node, removeTrap, onEscape);
    renderRow(); renderHeroCarousel(); renderSocialBar(); setupAdminButton();
    ensureAuthTokenPrompt();
    alert(isCreateMode.value ? "Usuario creado y sesión iniciada" : "¡Admin verificado!");
  });

  openModalFragment(node);
}

function openAdminMenuModal(){
  const modal = adminMenuModalTemplate.content.cloneNode(true);
  const node = modal.querySelector(".tw-modal");
  const btnLogout = modal.querySelector(".admin-menu-logout");
  const btnKeys = modal.querySelector(".admin-menu-keys");
  const modalClose = modal.querySelector(".tw-modal-close");

  const removeTrap = trapFocus(node);
  const onEscape = (e)=>{ if(e.key==="Escape") closeModal(node, removeTrap, onEscape); };
  if(modalClose) modalClose.addEventListener("click", ()=> closeModal(node, removeTrap, onEscape));

  if(btnLogout) btnLogout.addEventListener("click", ()=>{
    isAdmin=false; persistAdmin(false);
    try {
      localStorage.removeItem("tgx_admin_token");
      localStorage.removeItem(LS_ADMIN_HASH);
      localStorage.removeItem(LS_ADMIN_SALT);
      localStorage.removeItem(LS_ADMIN_USER);
    } catch (err) {}
    renderRow(); renderHeroCarousel(); renderSocialBar(); setupAdminButton();
    alert("Sesión cerrada.");
    closeModal(node, removeTrap, onEscape);
  });

  if(btnKeys) btnKeys.addEventListener("click", ()=>{
    openAdminCenter();
    closeModal(node, removeTrap, onEscape);
  });

  openModalFragment(node);
}

function stopAdminNotificationPolling(){
  if(adminNotifications.timer){
    try{ clearInterval(adminNotifications.timer); }catch(err){}
    adminNotifications.timer = null;
  }
}

function startAdminNotificationPolling(force = false){
  if(!isAdmin) return;
  stopAdminNotificationPolling();
  if(force){
    fetchAdminNotifications({ force: true }).catch(()=>{});
  }else{
    fetchAdminNotifications().catch(()=>{});
  }
  if(typeof window !== "undefined" && Number.isFinite(ADMIN_NOTIF_POLL_INTERVAL) && ADMIN_NOTIF_POLL_INTERVAL > 0){
    adminNotifications.timer = window.setInterval(()=>{
      fetchAdminNotifications().catch(err => console.error("[admin notifications] poll", err));
    }, ADMIN_NOTIF_POLL_INTERVAL);
  }
}

async function fetchAdminNotifications({ force = false } = {}){
  if(!isAdmin || !adminNotifications.wrap) return;
  if(adminNotifications.loading) return;
  adminNotifications.loading = true;
  adminNotifications.error = null;
  renderAdminNotifications();

  const params = new URLSearchParams({ latest: "1", limit: String(ADMIN_NOTIF_LIMIT) });
  if(!force){
    const sinceSource = adminNotifications.lastFetchedAt || adminNotifications.lastSeenAt;
    const sinceTime = parseTime(sinceSource);
    if(sinceTime){
      params.set("since", new Date(sinceTime).toISOString());
    }
  }

  try{
    const res = await fetch(`${API_COMMENTS}?${params.toString()}`, { cache: "no-store" });
    if(!res.ok){
      const text = await res.text().catch(()=> "");
      throw new Error(text || res.statusText || String(res.status));
    }
    const data = await res.json().catch(()=> []);
    const normalized = Array.isArray(data) ? data.map(normalizeComment).filter(item => item && item.id && item.postId) : [];
    if(force){
      adminNotifications.items = normalized
        .sort((a,b)=> parseTime(b.createdAt) - parseTime(a.createdAt))
        .slice(0, ADMIN_NOTIF_LIMIT);
    }else if(normalized.length){
      const map = new Map(adminNotifications.items.map(item => [String(item.id), item]));
      normalized.forEach(item => {
        const key = String(item.id);
        const prev = map.get(key) || {};
        map.set(key, { ...prev, ...item });
      });
      adminNotifications.items = Array.from(map.values())
        .sort((a,b)=> parseTime(b.createdAt) - parseTime(a.createdAt))
        .slice(0, ADMIN_NOTIF_LIMIT);
    }
    if(adminNotifications.items.length){
      const latest = parseTime(adminNotifications.items[0]?.createdAt);
      if(latest){
        adminNotifications.lastFetchedAt = new Date(latest).toISOString();
      }
    }else if(force && !adminNotifications.lastFetchedAt){
      adminNotifications.lastFetchedAt = new Date().toISOString();
    }
  }catch(err){
    adminNotifications.error = err;
    console.error("[admin notifications] fetch", err);
  }finally{
    adminNotifications.loading = false;
    renderAdminNotifications();
    if(adminNotifications.panelOpen){
      markAdminNotificationsAsSeen();
    }else{
      updateAdminNotificationBadge();
    }
  }
}

function updateAdminNotificationBadge(){
  const { count, button, items, lastSeenAt } = adminNotifications;
  if(button){
    const lastSeenTime = parseTime(lastSeenAt);
    let unseen = 0;
    for(const item of items){
      const created = parseTime(item?.createdAt);
      if(!created) continue;
      if(!lastSeenTime || created > lastSeenTime) unseen += 1;
    }
    button.classList.toggle("has-unseen", unseen > 0);
    if(count){
      if(unseen > 0){
        count.textContent = unseen > 99 ? "99+" : String(unseen);
        count.hidden = false;
      }else{
        count.hidden = true;
      }
    }
  }
}

function renderAdminNotifications(){
  const { wrap, list, empty, items, loading, error } = adminNotifications;
  if(!wrap || !list || !empty) return;
  list.innerHTML = "";
  list.hidden = true;

  if(!items.length){
    if(loading){
      empty.textContent = "Cargando notificaciones…";
    }else if(error){
      empty.textContent = "No se pudieron cargar las notificaciones.";
    }else{
      empty.textContent = "Sin comentarios nuevos.";
    }
    empty.hidden = false;
    updateAdminNotificationBadge();
    return;
  }

  empty.hidden = true;
  list.hidden = false;
  const lastSeenTime = parseTime(adminNotifications.lastSeenAt);

  items.forEach(item => {
    const li = document.createElement("li");
    li.className = "admin-notify-item";

    const entry = document.createElement("button");
    entry.type = "button";
    entry.className = "admin-notify-entry";
    entry.dataset.commentId = item.id ? String(item.id) : "";
    entry.dataset.postId = item.postId ? String(item.postId) : "";
    if(item.parentId) entry.dataset.parentId = String(item.parentId);
    if(item.postTitle) entry.dataset.postTitle = item.postTitle;
    if(item.postCategory) entry.dataset.postCategory = item.postCategory;
    if(item.parentId) entry.classList.add("is-reply");

    const created = parseTime(item.createdAt);
    if(!lastSeenTime || (created && created > lastSeenTime)){
      entry.classList.add("is-unseen");
    }

    const head = document.createElement("div");
    head.className = "admin-notify-entry-head";

    const postTitle = document.createElement("span");
    postTitle.className = "admin-notify-post";
    postTitle.textContent = item.postTitle || "Publicación";

    const meta = document.createElement("div");
    meta.className = "admin-notify-meta";
    if(item.parentId){
      const replyBadge = document.createElement("span");
      replyBadge.className = "admin-notify-reply";
      replyBadge.textContent = "Respuesta";
      meta.appendChild(replyBadge);
    }
    if(item.postCategory){
      const cat = document.createElement("span");
      cat.className = "admin-notify-category";
      cat.textContent = formatCategoryLabel(item.postCategory);
      meta.appendChild(cat);
    }
    const timeEl = document.createElement("time");
    timeEl.className = "admin-notify-date";
    if(item.createdAt) timeEl.dateTime = item.createdAt;
    timeEl.textContent = formatCommentDate(item.createdAt || Date.now());
    meta.appendChild(timeEl);

    head.append(postTitle, meta);

    const body = document.createElement("div");
    body.className = "admin-notify-body";
    const alias = document.createElement("span");
    alias.className = "admin-notify-alias";
    alias.textContent = item.alias || "Anónimo";
    const msg = document.createElement("p");
    msg.className = "admin-notify-message";
    const cleanMessage = String(item.message || "").replace(/\s+/g, " ").trim();
    msg.textContent = cleanMessage.length > 160 ? `${cleanMessage.slice(0,157)}…` : cleanMessage;
    body.append(alias, msg);

    entry.append(head, body);
    li.appendChild(entry);
    list.appendChild(li);
  });

  updateAdminNotificationBadge();
}

function markAdminNotificationsAsSeen(){
  if(!adminNotifications.items.length) return;
  const latest = parseTime(adminNotifications.items[0]?.createdAt);
  if(!latest) return;
  const iso = new Date(latest).toISOString();
  adminNotifications.lastSeenAt = iso;
  saveAdminNotificationsSeen(iso);
  updateAdminNotificationBadge();
  if(adminNotifications.list){
    adminNotifications.list.querySelectorAll(".admin-notify-entry.is-unseen").forEach(el => el.classList.remove("is-unseen"));
  }
}

function closeAdminNotificationsPanel(silent = false){
  const { panel, button, wrap } = adminNotifications;
  if(panel) panel.hidden = true;
  if(button) button.setAttribute("aria-expanded", "false");
  wrap?.classList.remove("is-open");
  adminNotifications.panelOpen = false;
  if(!silent) updateAdminNotificationBadge();
}

function openAdminNotificationsPanel(){
  if(!isAdmin || !adminNotifications.panel) return;
  if(adminNotifications.panelOpen) return;
  adminNotifications.panel.hidden = false;
  adminNotifications.button?.setAttribute("aria-expanded", "true");
  adminNotifications.wrap?.classList.add("is-open");
  adminNotifications.panelOpen = true;
  adminNotifications.panel?.focus?.();
  renderAdminNotifications();
  markAdminNotificationsAsSeen();
  fetchAdminNotifications({ force: true }).catch(()=>{});
}

function handleAdminNotificationToggle(){
  if(adminNotifications.panelOpen){
    closeAdminNotificationsPanel();
  }else{
    openAdminNotificationsPanel();
  }
}

async function openNotificationItem(notification){
  if(!notification || !notification.postId) return;
  closeAdminNotificationsPanel();

  const postId = String(notification.postId);
  let base = (Array.isArray(recientes) ? recientes : []).find(item => item?.id === postId);
  let modal = null;

  try{
    if(base){
      const merged = { ...base };
      if(notification.postTitle && !merged.title) merged.title = notification.postTitle;
      if(notification.postCategory && !merged.category) merged.category = notification.postCategory;
      modal = openGameLazy(merged);
    }else{
      let detail = null;
      try{
        detail = await apiGet(postId);
      }catch(err){
        console.error("[admin notifications] detalle", err);
      }
      if(detail){
        if(notification.postTitle && !detail.title) detail.title = notification.postTitle;
        if(notification.postCategory && !detail.category) detail.category = notification.postCategory;
        modal = openGame(detail);
      }else{
        modal = openGameLazy({ id: postId, title: notification.postTitle || "Publicación" });
      }
    }

    modal?.openComments?.({
      focus: true,
      highlightId: notification.id || null,
      highlightParentId: notification.parentId || null,
    });
  }catch(err){
    console.error("[admin notifications] open", err);
    alert("No se pudo abrir la publicación asociada al comentario.");
  }
}

async function handleAdminNotificationListClick(ev){
  const entry = ev.target.closest?.(".admin-notify-entry");
  if(!entry) return;
  ev.preventDefault();
  const commentId = entry.dataset.commentId || "";
  const target = adminNotifications.items.find(item => String(item.id) === commentId);
  await openNotificationItem(target);
}

function updateAdminNotificationsState(){
  const { wrap, button, panel } = adminNotifications;
  if(!wrap || !button || !panel){
    stopAdminNotificationPolling();
    return;
  }
  const visible = Boolean(isAdmin);
  wrap.hidden = !visible;
  wrap.setAttribute("aria-hidden", String(!visible));
  if(!visible){
    closeAdminNotificationsPanel(true);
    stopAdminNotificationPolling();
    adminNotifications.button?.classList.remove("has-unseen");
    if(adminNotifications.count) adminNotifications.count.hidden = true;
    adminNotifications.items = [];
    adminNotifications.error = null;
    adminNotifications.lastFetchedAt = null;
    renderAdminNotifications();
    return;
  }
  if(!adminNotifications.timer){
    startAdminNotificationPolling(true);
  }else{
    updateAdminNotificationBadge();
  }
}

function setupAdminNotifications(){
  const wrap = document.querySelector(".admin-notify");
  const button = wrap?.querySelector?.(".admin-notify-btn");
  const count = wrap?.querySelector?.(".admin-notify-count");
  const panel = wrap?.querySelector?.(".admin-notify-panel");
  const list = wrap?.querySelector?.(".admin-notify-list");
  const empty = wrap?.querySelector?.(".admin-notify-empty");
  const refreshBtn = wrap?.querySelector?.(".admin-notify-refresh");

  if(!wrap || !button || !panel || !list || !empty){
    stopAdminNotificationPolling();
    adminNotifications.wrap = null;
    adminNotifications.button = null;
    adminNotifications.count = null;
    adminNotifications.panel = null;
    adminNotifications.list = null;
    adminNotifications.empty = null;
    adminNotifications.refreshBtn = null;
    return;
  }

  adminNotifications.wrap = wrap;
  adminNotifications.button = button;
  adminNotifications.count = count;
  adminNotifications.panel = panel;
  adminNotifications.list = list;
  adminNotifications.empty = empty;
  adminNotifications.refreshBtn = refreshBtn;

  if(!adminNotifications.initialized){
    button.addEventListener("click", handleAdminNotificationToggle);
    list.addEventListener("click", handleAdminNotificationListClick);
    refreshBtn?.addEventListener("click", ()=> fetchAdminNotifications({ force: true }));
    adminNotifications.docClickHandler = (ev)=>{
      if(!adminNotifications.panelOpen) return;
      if(adminNotifications.wrap?.contains(ev.target)) return;
      closeAdminNotificationsPanel();
    };
    adminNotifications.docKeyHandler = (ev)=>{
      if(ev.key === "Escape" && adminNotifications.panelOpen){
        closeAdminNotificationsPanel();
      }
    };
    document.addEventListener("click", adminNotifications.docClickHandler);
    document.addEventListener("keydown", adminNotifications.docKeyHandler);
    adminNotifications.initialized = true;
  }

  panel.hidden = true;
  button.setAttribute("aria-expanded", "false");
  updateAdminNotificationsState();
  renderAdminNotifications();
}

function setupAdminButton(){
  const btn=document.querySelector(".user-pill");
  if(btn){
    btn.title = isAdmin ? "Cerrar sesión de administrador" : "Iniciar sesión de administrador";
    btn.onclick = ()=>{
      if(isAdmin){
        openAdminMenuModal();
      } else {
        openAdminLoginModal();
      }
    };
  }
  setupAdminNotifications();
}

/* =========================
   Badge lateral → Descargas
   ========================= */
function ensureDownloadsBadge(){
  const rail = document.querySelector(".side-nav");
  if(!rail) return;

  let el = rail.querySelector(".yt-channel-badge");
  const svgMarkup = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16.5a1 1 0 0 1-.7-.29l-5-5a1 1 0 0 1 1.4-1.42L12 14.09l4.3-4.3a1 1 0 1 1 1.4 1.42l-5 5a1 1 0 0 1-.7.29Z"/></svg>';

  // Si fuera <a>, lo convierto a <button> para abrir Descargas (sin romper estilos)
  if (el && el.tagName === "A") {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = el.className;
    while (el.firstChild) btn.appendChild(el.firstChild);
    el.replaceWith(btn);
    el = btn;
  }

  if (!el) {
    el = document.createElement("button");
    el.type = "button";
    el.className = "yt-channel-badge";
    rail.appendChild(el);
  }
  el.innerHTML = svgMarkup;
  el.setAttribute("aria-label", "Descargas");
  el.onclick = toggleDownloadsPanel;
  return el;
}

function renderDownloadsPanel(panel){
  panel = panel || document.getElementById('downloads-panel');
  if(!panel) return;
  const desc = panel.querySelector('.downloads-content');
  if(!desc) return;
  desc.innerHTML = '';
  let downloads = [];
  try{ downloads = JSON.parse(localStorage.getItem('tgx_downloads') || '[]'); }
  catch(err){ downloads = []; }

  if (activeDownloads.length) {
    const aTitle = document.createElement('h3');
    aTitle.textContent = 'En progreso';
    desc.appendChild(aTitle);
    const aList = document.createElement('ul');
    activeDownloads.forEach(dl => {
      const li = document.createElement('li');
      li.className = 'download-item active';
      const name = document.createElement('strong');
      name.textContent = dl.name || 'Archivo';
      const prog = document.createElement('progress');
      prog.className = 'download-progress';
      prog.max = dl.total || 1;
      prog.value = dl.loaded;
      const status = document.createElement('div');
      status.className = 'download-status';
      const pct = document.createElement('span');
      pct.textContent = dl.total ? `${Math.floor((dl.loaded/dl.total)*100)}%` : '0%';
      const speedEl = document.createElement('span');
      speedEl.className = 'download-speed';
      const toMBps = (bytesPerSecond) => (bytesPerSecond || 0) / (1024 * 1024);
      let shownSpeed = toMBps(dl.speed);
      speedEl.textContent = shownSpeed.toFixed(2) + ' MB/s';
      if (dl.status === 'paused') {
        const resumeBtn = document.createElement('button');
        resumeBtn.type = 'button';
        resumeBtn.classList.add('resume-btn');
        resumeBtn.textContent = 'Continuar';
        resumeBtn.addEventListener('click', () => {
          downloadFromDrive({ id: dl.id, name: dl.name, dl, resume: true });
          renderDownloadsPanel();
        });
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.classList.add('delete-btn');
        deleteBtn.textContent = 'Eliminar';
        deleteBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          dl.remove?.();
          setTimeout(() => li.remove(), 0);
        });
        status.append(pct, speedEl, resumeBtn, deleteBtn);
      } else {
        const actionBtn = document.createElement('button');
        actionBtn.type = 'button';
        actionBtn.classList.add('cancel-btn');
        actionBtn.textContent = 'Cancelar';
        actionBtn.addEventListener('click', () => { dl.cancel?.({ purge: true }); li.remove(); });
        status.append(pct, speedEl, actionBtn);
      }
      li.append(name, prog, status);
      aList.appendChild(li);
      dl.onupdate = () => {
        prog.max = dl.total || 1;
        prog.value = dl.loaded;
        pct.textContent = dl.total ? `${Math.floor((dl.loaded/dl.total)*100)}%` : '0%';
        const current = toMBps(dl.speed);
        shownSpeed = shownSpeed * 0.8 + current * 0.2;
        speedEl.textContent = shownSpeed.toFixed(2) + ' MB/s';
      };
    });
    desc.appendChild(aList);
  }

  if (downloads.length) {
    if(activeDownloads.length){
      const hTitle = document.createElement('h3');
      hTitle.textContent = 'Historial';
      desc.appendChild(hTitle);
    }
    const list = document.createElement('ul');
    const items = downloadsExpanded ? downloads : downloads.slice(0,3);
    items.forEach(d => {
      const li = document.createElement('li');
      li.className = 'download-item';
      const platform = d.platform || (d.url ? 'gofile' : 'drive');
      d.platform = platform;
      li.dataset.platform = platform;
      const name = document.createElement('strong');
      name.textContent = d.name || 'Archivo';
      const date = document.createElement('span');
      const dt = d.created_at || d.date;
      date.textContent = dt ? ` – ${new Date(dt).toLocaleString()} – ` : ' ';
      const status = document.createElement('div');
      status.className = 'download-status';
      status.textContent = 'Descarga exitosa';
      // TODO: si se desea reintentar en el futuro, almacenar un campo `status`
      // y mostrar el botón solo para elementos fallidos.
      li.append(name, date, status);
      list.appendChild(li);
    });
    desc.appendChild(list);
    if(downloads.length > 3){
      const tBtn = document.createElement('button');
      tBtn.type = 'button';
      tBtn.className = 'toggle-history';
      tBtn.textContent = downloadsExpanded ? 'Ver menos' : 'Ver todo';
      tBtn.addEventListener('click', () => {
        downloadsExpanded = !downloadsExpanded;
        renderDownloadsPanel(panel);
      });
      desc.appendChild(tBtn);
    }
  } else if(!activeDownloads.length) {
    desc.textContent = 'No hay descargas.';
  }
}

function toggleDownloadsPanel(){
  document.querySelector('.dl-tip')?.remove();
  let panel = document.getElementById('downloads-panel');
  if(!panel){
    panel = document.createElement('aside');
    panel.id = 'downloads-panel';
    panel.className = 'downloads-panel';
    panel.innerHTML = `
      <h2>Descargas</h2>
      <button type="button" class="clear-history">Limpiar historial</button>
      <div class="downloads-content"></div>`;
    document.body.appendChild(panel);
  }

  const badge = document.querySelector('.yt-channel-badge');

  panel.querySelector('.clear-history').onclick = () => {
    localStorage.removeItem('tgx_downloads');
    renderDownloadsPanel(panel);
  };

  const onOutside = ev => {
    if(panel.contains(ev.target) || (badge && badge.contains(ev.target))) return;
    panel.classList.remove('open');
    document.removeEventListener('click', onOutside);
    panel._outsideHandler = null;
  };

  if(panel.classList.contains('open')){
    panel.classList.remove('open');
    if(panel._outsideHandler) document.removeEventListener('click', panel._outsideHandler);
    panel._outsideHandler = null;
    return;
  }

  renderDownloadsPanel(panel);
  if(badge){
    const rect = badge.getBoundingClientRect();
    panel.style.left = (rect.right + 8) + 'px';
    panel.style.bottom = (window.innerHeight - rect.bottom) + 'px';
  }
  panel.classList.add('open');
  panel._outsideHandler = onOutside;
  document.addEventListener('click', onOutside);
}
document.addEventListener('DOMContentLoaded', resumeDriveDownloads);
function resumeDriveDownloads(){
  for(let i=0; i<localStorage.length; i++){
    const key = localStorage.key(i);
    if(!key || !key.startsWith('tgx_drive_')) continue;
    try{
      const state = JSON.parse(localStorage.getItem(key) || '{}');
      if(!state || !Array.isArray(state.completed)) continue;
      const id = key.slice('tgx_drive_'.length);
      const name = state.name || 'Archivo';
      const dl = {
        id,
        name,
        total: state.total || 0,
        loaded: state.loaded || 0,
        progress: state.total ? state.loaded / state.total : 0,
        completed: state.completed.slice(),
        status: 'paused',
        speed: 0,
        onupdate: null,
        cancel: null
      };
      activeDownloads.push(dl);
    }catch(err){ /* ignore */ }
  }
  if(activeDownloads.length){
    renderDownloadsPanel();
  }
}
ensureDownloadsBadge();
async function openGofileFolder(id, title){
  if(!id) return;
  let files = [];
  try{
    const r = await fetch('/.netlify/functions/gofile?list=' + encodeURIComponent(id));
    if(r.ok){
      const j = await r.json();
      files = Array.isArray(j.files) ? j.files : [];
    }
  }catch(err){ files = []; }

  const node = document.createElement('div');
  node.className = 'tw-modal gofile-modal';
  node.innerHTML = `
    <div class="tw-modal-backdrop"></div>
    <div class="tw-modal-content">
      <button class="tw-modal-close" aria-label="Cerrar">&times;</button>
      <h2 class="tw-modal-title"></h2>
      <div class="tw-modal-description"></div>
    </div>`;
  const titleEl = node.querySelector('.tw-modal-title');
  if(titleEl) titleEl.textContent = title || 'Archivos';
  const desc = node.querySelector('.tw-modal-description');
  if(files.length){
    const list = document.createElement('ul');
    files.forEach(file => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = '#';
      link.textContent = file.name || 'Archivo';
      link.addEventListener('click', ev => {
        ev.preventDefault();
        downloadFromGofile({ id: file.id, name: file.name });
      });
      li.appendChild(link);
      list.appendChild(li);
    });
    desc.appendChild(list);
  } else {
    desc.textContent = 'No hay archivos.';
  }

  const close = node.querySelector('.tw-modal-close');
  const removeTrap = trapFocus(node);
  const onEscape = e => { if (e.key === 'Escape') closeModal(node, removeTrap, onEscape); };
  close?.addEventListener('click', () => closeModal(node, removeTrap, onEscape));

  openModalFragment(node);
}
async function downloadFromGofile(item){
  try {
    const r = await fetch(`/.netlify/functions/gofile?id=${encodeURIComponent(item.id)}`);
    if(!r.ok) throw new Error('fetch failed');
    const data = await r.json();
    if(!data.url) throw new Error('no url');

    try{
      const hist = JSON.parse(localStorage.getItem('tgx_downloads') || '[]');
      hist.unshift({ id:item.id, name:item.name||item.title||null, date:Date.now(), url:data.url, platform:'gofile' });
      hist.splice(50);
      localStorage.setItem('tgx_downloads', JSON.stringify(hist));
    }catch(err){ /* ignore */ }

    window.open(data.url, '_blank');
  } catch(err){
    console.error('[downloadFromGofile]', err);
    alert('No se pudo descargar');
  }
}

async function downloadSingleFile(f, dl){
  const size = parseInt(f.size || '0', 10);
  const stateKey = `tgx_drive_${dl.id}`;
  const persist = () => {
    try {
      localStorage.setItem(stateKey, JSON.stringify({ loaded: dl.loaded, total: dl.total, name: dl.name }));
    } catch (_) {}
  };
  const startLoaded = dl.loaded;
  const subDl = { id: f.id, name: f.name, total: size, loaded: 0, progress: 0, completed: [], status: 'downloading', speed: 0, onupdate: (d) => {
    dl.loaded = startLoaded + d.loaded;
    dl.speed = d.speed;
    dl.progress = dl.total ? dl.loaded / dl.total : 0;
    persist();
    dl.onupdate && dl.onupdate(dl);
    renderDownloadsPanel();
  }};
  dl.cancel = (opts) => subDl.cancel?.(opts);
  await downloadFromDrive({ id: f.id, name: f.name, dl: subDl, skipHistory: true });
  dl.loaded = startLoaded + size;
  dl.progress = dl.total ? dl.loaded / dl.total : 0;
  persist();
  renderDownloadsPanel();
}

async function downloadFromDrive(input){
  let writer;
  let writerClosed = false;
  let speedTimer;
  try {
    let parts = Array.isArray(input) ? input : input?.parts;
    let id    = Array.isArray(input) ? input[0]?.id : input?.id;
    const resume = !!input?.resume;
    const skipHistory = !!input?.skipHistory;
    let token, makeUrl;
    if(!id) throw new Error('missing id');
    const meta = await fetch(`/.netlify/functions/drive?id=${encodeURIComponent(id)}`);
    if(!meta.ok) throw new Error('meta failed');
    const m = await meta.json();
    if (m.mimeType === 'application/vnd.google-apps.folder') {
      const r = await fetch(`/.netlify/functions/drive?list=${id}`);
      const data = await r.json();
      const files = data.files || [];
      const total = files.reduce((s,f)=>s + parseInt(f.size||0,10),0);
      const existing = input?.dl;
      const dl = existing || { id, name: m.name, total, loaded: 0, progress: 0, status: 'downloading', speed: 0, onupdate: null };
      dl.total = total;
      if(!existing) activeDownloads.push(dl);
      renderDownloadsPanel();
      for (const f of files) {
        await downloadSingleFile(f, dl);
      }
      dl.status = 'done';
      const idx = activeDownloads.indexOf(dl);
      if(idx>=0) activeDownloads.splice(idx,1);
      try {
        const hist = JSON.parse(localStorage.getItem('tgx_downloads')||'[]');
        hist.unshift({ id, name: dl.name, date: Date.now(), platform: 'drive' });
        hist.splice(50);
        localStorage.setItem('tgx_downloads', JSON.stringify(hist));
      } catch (_) {}
      localStorage.removeItem(`tgx_drive_${dl.id}`);
      renderDownloadsPanel();
      return;
    }
    const name = m.name || input?.name || 'archivo.bin';
    token = m.token;
    makeUrl = (start, end) =>
      `https://www.googleapis.com/drive/v3/files/${id}?alt=media`;
    if(!parts){
      const total = parseInt(m.size || '0', 10);
      const chunk = 8 * 1024 * 1024; // 8MB
      const count = total ? Math.ceil(total/chunk) : 1;
      parts = Array.from({length:count}, (_,i)=>{
        const start = i*chunk;
        const end = total ? Math.min(total-1,(i+1)*chunk-1) : undefined;
        return { start, end };
      });
    }
    const db = await new Promise((resolve) => {
      try {
        const req = indexedDB.open('tgx_drive_chunks', 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('chunks')) {
            db.createObjectStore('chunks', { keyPath: ['id', 'partIndex'] });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch (_) { resolve(null); }
    });
    const controller = new AbortController();
    const stateKey = `tgx_drive_${id}`;
    const existing = input?.dl;
    const dl = existing || { id, name, total:0, loaded:0, progress:0, completed:[], status:'downloading', speed:0, onupdate:null };

    const stopActiveDownload = () => {
      try { controller.abort(); } catch (_) {}
      if (speedTimer) clearInterval(speedTimer);
      if (writer && !writerClosed) {
        try { writer.abort(); }
        catch (_) {}
        writerClosed = true;
      }
    };
    const purgePersistedState = async () => {
      try { localStorage.removeItem(stateKey); } catch (_) {}
      if (db) {
        try {
          await new Promise((resolve) => {
            const tx = db.transaction('chunks', 'readwrite');
            const store = tx.objectStore('chunks');
            for (let i = 0; i < parts.length; i++) store.delete([id, i]);
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
          });
        } catch (_) {}
      }
    };
    const removeFromActive = () => {
      const idx = activeDownloads.indexOf(dl);
      if (idx >= 0) activeDownloads.splice(idx, 1);
    };
    const cleanupAndRemove = (status) => {
      stopActiveDownload();
      dl.status = status;
      void purgePersistedState();
      removeFromActive();
      renderDownloadsPanel();
    };

    dl.status = 'downloading';
    dl.cancel = (opts = {}) => {
      if (opts?.purge) {
        cleanupAndRemove('cancelled');
        return;
      }
      stopActiveDownload();
      dl.status = 'paused';
      persist();
      renderDownloadsPanel();
    };
    dl.remove = () => {
      cleanupAndRemove('removed');
    };
    if(!existing) activeDownloads.push(dl);
    const badge = document.querySelector('.yt-channel-badge');
    if (badge && !resume) {
      document.querySelector('.dl-tip')?.remove();
      const tip = document.createElement('div');
      tip.className = 'dl-tip';
      tip.textContent = 'Tu descarga ya está en progreso';
      document.body.appendChild(tip);
      const rect = badge.getBoundingClientRect();
      const tipRect = tip.getBoundingClientRect();
      tip.style.left = `${rect.right + 8}px`;
      tip.style.top = `${rect.top + rect.height / 2 - tipRect.height / 2}px`;
      setTimeout(() => tip.remove(), 4000);
    }

    dl.completed = Array(parts.length).fill(false);
    dl.loaded = 0;
    const results = new Array(parts.length);
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(stateKey)||'{}');
      if (Array.isArray(saved.completed) && saved.partCount === parts.length) {
        dl.completed = saved.completed.slice(0, parts.length);
      } else {
        saved.completed = [];
      }
    } catch (_) { saved = { completed: [] }; }
    dl.loaded = saved.loaded || 0;
    if (db) {
      for (let i = 0; i < parts.length; i++) {
        try {
          const rec = await new Promise((resolve) => {
            const tx = db.transaction('chunks', 'readonly');
            const store = tx.objectStore('chunks');
            const req = store.get([id, i]);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
          });
          if (rec && rec.chunks) {
            results[i] = rec.chunks.map(b => new Uint8Array(b));
          }
          dl.completed[i] = !!rec;
          dl.loaded += saved.completed[i] ? 0 : (rec?.size || 0);
        } catch (_) { dl.completed[i] = false; }
      }
    }

    dl.total = parts.reduce((s,p)=> s + ((p.end!=null?p.end:p.start) - (p.start||0) + 1),0);
    const fileStream = streamSaver.createWriteStream(name, { size: dl.total });
    writer = fileStream.getWriter();

    let lastTime = performance.now(), lastLoaded = dl.loaded, lastSpeedTime = lastTime;
    const speeds = new Array(5).fill(0);
    let speedIdx = 0;
    let speedCount = 0;
    let speedSum = 0;
    const persist = () => {
      try {
        localStorage.setItem(stateKey, JSON.stringify({
          completed: dl.completed,
          loaded: dl.loaded,
          partCount: parts.length,
          name,
          total: dl.total
        }));
      } catch (err) {}
    };
    const emit = (force = false) => {
      dl.progress = dl.total ? dl.loaded / dl.total : 0;
      const now = performance.now();
      if (force || now - lastSpeedTime >= 1000) {
        const delta = Math.max(now - lastTime, 1);
        const current = (dl.loaded - lastLoaded) / (delta/1000);
        if (speedCount < speeds.length) {
          speedCount++;
        } else {
          speedSum -= speeds[speedIdx];
        }
        speeds[speedIdx] = current;
        speedSum += current;
        speedIdx = (speedIdx + 1) % speeds.length;
        dl.speed = speedSum / speedCount;
        lastTime = now;
        lastLoaded = dl.loaded;
        lastSpeedTime = now;
      }
      dl.onupdate && dl.onupdate(dl);
    };

    persist();
    emit(true);
    speedTimer = setInterval(() => emit(true), 1000);

    async function fetchPart(part, idx){
      if(dl.completed[idx]) return [];
      const maxRetries = 3;
      for(let attempt=0; attempt<maxRetries; attempt++){
        try{
          const headers = { Authorization: `Bearer ${token}`, Range: `bytes=${part.start}-${part.end}` };
          const res = await fetch(makeUrl(part.start, part.end), { headers, signal: controller.signal });
          if(!res.ok) throw new Error(`HTTP ${res.status}`);
          const reader = res.body.getReader();
          const chunks = [];
          let lastPersist = 0;
          while(true){
            const {done,value} = await reader.read();
            if(done) break;
            chunks.push(value);
            dl.loaded += value.length;
            if (performance.now() - lastPersist > 1000) { persist(); lastPersist = performance.now(); }
            emit();
          }
          dl.completed[idx] = true;
          if (db) {
            try {
              const buffers = chunks.map(c => c.buffer.slice(c.byteOffset, c.byteOffset + c.byteLength));
              const size = buffers.reduce((s, b) => s + b.byteLength, 0);
              await new Promise((resolve) => {
                const tx = db.transaction('chunks', 'readwrite');
                const store = tx.objectStore('chunks');
                store.put({ id, partIndex: idx, chunks: buffers, size });
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
              });
            } catch (_) {}
          }
          persist();
          return chunks;
        }catch(err){
          if(err.name === 'AbortError') return [];
          if(attempt === maxRetries - 1){
            dl.status = 'error';
            try{ controller.abort(); }catch(_){ }
            if(writer && !writerClosed){ try{ await writer.abort(); }catch(_){ } writerClosed = true; }
            throw err;
          }
          const delay = Math.pow(2, attempt) * 500;
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    let pending = parts.map((_, i) => i).filter(i => !dl.completed[i]);
    const concurrency = Math.min(8, navigator.hardwareConcurrency || 4);
    const maxRounds = 5;
    let round = 0;
    while (pending.length && round < maxRounds) {
      const current = pending;
      pending = [];
      await Promise.all(Array.from({ length: concurrency }, async () => {
        while (current.length) {
          const idx = current.shift();
          try { results[idx] = await fetchPart(parts[idx], idx); }
          catch { pending.push(idx); }
        }
      }));
      round++;
    }
    if (pending.length) {
      dl.status = 'error';
      if(writer && !writerClosed){ try{ await writer.abort(); }catch(_){ } writerClosed = true; }
      const i = activeDownloads.indexOf(dl);
      if(i>=0) activeDownloads.splice(i,1);
      if (speedTimer) clearInterval(speedTimer);
      emit(true);
      return;
    }
    for (let i = 0; i < results.length; i++) {
      const partChunks = results[i];
      if(!partChunks) continue;
      for (const chunk of partChunks) {
        await writer.write(chunk);
      }
    }
      if (!writerClosed) {
        await writer.close();
        writerClosed = true;
      }
      if (db) {
        try {
          await new Promise((resolve) => {
            const tx = db.transaction('chunks', 'readwrite');
            const store = tx.objectStore('chunks');
            for (let i = 0; i < parts.length; i++) store.delete([id, i]);
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
          });
        } catch (_) {}
      }
      localStorage.removeItem(stateKey);
    if(!skipHistory){
      const hist = JSON.parse(localStorage.getItem('tgx_downloads')||'[]');
      hist.unshift({ id, name, date: Date.now(), platform:'drive' });
      hist.splice(50);
      localStorage.setItem('tgx_downloads', JSON.stringify(hist));
    }
    dl.status='done';
    const idx = activeDownloads.indexOf(dl);
    if(idx>=0) activeDownloads.splice(idx,1);
    if (speedTimer) clearInterval(speedTimer);
    emit(true);
    renderDownloadsPanel();
  } catch(err){
    console.error('[downloadFromDrive]', err);
    if(writer && !writerClosed){ try{ await writer.abort(); }catch(_){ } writerClosed = true; }
    if (speedTimer) clearInterval(speedTimer);
    alert('No se pudo descargar');
    renderDownloadsPanel();
  }
}

/* =========================
   Admin Center
   ========================= */
function randomKey(len=28){
  const chars="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let s=""; const a=new Uint8Array(len); crypto.getRandomValues(a);
  for(const n of a) s += chars[n % chars.length];
  return s;
}

async function openAdminCenter(){
  if(!isAdmin){ return; }
  const token=localStorage.getItem("tgx_admin_token")||"";
  if(!token){ alert("Falta AUTH_TOKEN de Netlify para gestionar llaves."); return; }

  const frag = document.createDocumentFragment();
  const wrap = document.createElement("div");
  wrap.className="tw-modal active";
  wrap.innerHTML = `
  <div class="tw-modal-backdrop"></div>
  <div class="tw-modal-content" style="max-width:720px">
    <button class="tw-modal-close" aria-label="Cerrar">×</button>
    <h2 class="tw-modal-title">Admin Center · Llaves de acceso</h2>
    <div class="tw-modal-body">
      <div class="adm-actions" style="display:flex;gap:.5rem;align-items:center;margin-bottom:.75rem;">
        <input class="adm-new-name" placeholder="Nombre (opcional)" style="flex:1;min-width:120px;">
        <button class="adm-new-btn">Crear nueva llave</button>
      </div>
      <div class="adm-note" style="font-size:.9rem;opacity:.85;margin:.25rem 0 .75rem">
        La llave se muestra una sola vez al crearla. Comparte el texto de la llave con quien tendrá acceso.
      </div>
      <div class="adm-list" style="max-height:50vh;overflow:auto;border:1px solid #2a323a;border-radius:12px;padding:.5rem"></div>
    </div>
  </div>`;
  frag.appendChild(wrap);
  document.body.appendChild(frag);

  const modalClose = wrap.querySelector(".tw-modal-close");
  const removeTrap=trapFocus(wrap);
  const onEscape=(e)=>{ if(e.key==="Escape") closeModal(wrap, removeTrap, onEscape); };
  modalClose.addEventListener("click", ()=> closeModal(wrap, removeTrap, onEscape));

  const listBox = wrap.querySelector(".adm-list");
  const btnNew  = wrap.querySelector(".adm-new-btn");
  const nameInp = wrap.querySelector(".adm-new-name");

  function renderList(items){
    listBox.innerHTML="";
    if(!items.length){ listBox.innerHTML=`<div style="opacity:.7">No hay llaves creadas.</div>`; return; }
    for(const it of items){
      const row=document.createElement("div");
      row.style.display="grid";
      row.style.gridTemplateColumns="1fr auto auto";
      row.style.alignItems="center";
      row.style.gap=".5rem";
      row.style.padding=".4rem .25rem";
      row.style.borderBottom="1px dashed #2a323a";
      const idShort = String(it.id).slice(-6).padStart(6,"·");
      const status = it.revoked_at ? "Revocada" : "Activa";
      row.innerHTML = `
        <div>
          <div style="font-weight:600">${it.name || "(sin nombre)"} <span style="opacity:.6">#${idShort}</span></div>
          <div style="opacity:.65;font-size:.85rem">${new Date(it.created_at).toLocaleString()} · ${status}</div>
        </div>
        <button class="adm-revoke">${it.revoked_at ? "Revocada" : "Revocar"}</button>
        <button class="adm-copy-hash" title="Copiar hash" disabled>Hash oculto</button>
      `;
      const revokeBtn = row.querySelector(".adm-revoke");
      revokeBtn.addEventListener("click", async ()=>{
        if(it.revoked_at){ alert("Ya está revocada."); return; }
        if(!confirm("¿Revocar esta llave?")) return;
        try{ await adminRevokeKey(it.id, token); await refresh(); }
        catch(err){ console.error(err); alert("No se pudo revocar."); }
      });
      listBox.appendChild(row);
    }
  }
  async function refresh(){
    try{ const data=await adminListKeys(token); renderList(Array.isArray(data)?data:[]); }
    catch(err){ console.error(err); listBox.innerHTML=`<div style="color:#ff9e9e">Error cargando llaves.</div>`; }
  }
  btnNew.addEventListener("click", async ()=>{
    const name = (nameInp.value||"").trim();
    const plain = randomKey(28);
    const hash = await sha256(plain);
    try{
      await adminCreateKey(name, hash, token);
      await refresh();
      setTimeout(()=>{ alert(`Llave creada.\n\nEntregar al usuario:\n${plain}\n\n(Se valida por hash en servidor)`); }, 50);
    }catch(err){ console.error(err); alert("No se pudo crear llave."); }
  });
  refresh();
}

/* =========================
   Carga inicial
   ========================= */
async function reloadData(){
  try{ const data=await apiList(window.currentCategory, { force: true }); recientes=Array.isArray(data)?data:[]; }
  catch(e){ console.error("[reload posts]", e); recientes=[]; }
  renderRow();
  renderHeroCarousel();
}
async function initData(){
  const postsPromise = (async ()=>{
    try{
      const data = await apiList(window.currentCategory);
      recientes = Array.isArray(data)?data:[];
    }catch(e){
      console.error("[initData posts]", e);
      recientes = [];
    }finally{
      renderRow();
      renderHeroCarousel();
    }
  })();

  renderSocialBar();
  const socialsPromise = (async ()=>{
    try{
      const data = await socialsList();
      socials = Array.isArray(data)?data:[];
    }catch(e){
      console.error("[initData socials]", e);
      socials = [];
    }finally{
      renderSocialBar();
    }
  })();

  setupSearch();
  setupDmcaButton();
  setupFaqButton();
  setupAdminButton();
  setupSideNav();

  await Promise.allSettled([postsPromise, socialsPromise]);
}
recalcPageSize();
window.addEventListener('resize', ()=>{ recalcPageSize(); renderRow(); });
initData();








































































































