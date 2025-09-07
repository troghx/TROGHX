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

const dmcaTexts = {
  es: `
    <p><strong>TROGH GAMES</strong> no aloja archivos ni juegos con derechos de autor. Este sitio solo muestra metadatos y <em>enlaces</em> hacia servicios de terceros que alojan los contenidos bajo sus propios términos.</p>

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

    <p>Envíanos tu aviso a través del <a href="/dmca.html" class="dmca-form-link">formulario DMCA</a> (recomendado) o por correo a <a href="mailto:troghgames@gmail.com">troghgames@gmail.com</a>.</p>

    <p class="muted" style="opacity:.8">Nota: si el archivo está alojado por un tercero (p. ej., MEGA, Google Drive, YouTube, etc.), también deberás contactar a ese servicio para la retirada del material en su plataforma.</p>

    <h4 style="margin-top:1rem">Contra-aviso</h4>
    <p>Si eres el publicador del enlace retirado y crees que hubo un error o cuentas con autorización, puedes enviar un <strong>contra-aviso</strong> con tus datos de contacto, la URL retirada y una declaración bajo protesta de decir verdad indicando que la retirada fue por error. Tras recibir un contra-aviso válido, podremos restituir el contenido salvo que el denunciante nos informe de acciones legales.</p>

    <h4 style="margin-top:1rem">Reincidencia</h4>
    <p>Podemos limitar publicaciones o accesos de usuarios/colaboradores que incurran reiteradamente en infracciones.</p>
  `,
  en: `
    <p><strong>TROGH GAMES</strong> does not host copyrighted files. We only display metadata and <em>links</em> to third-party services that host the content under their own terms.</p>

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

    <p>Send your notice via our <a href="/dmca.html" class="dmca-form-link">DMCA form</a> (recommended) or email <a href="mailto:troghgames@gmail.com">troghgames@gmail.com</a>.</p>

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

/* ------- Endpoints ------- */
const API_POSTS = "/.netlify/functions/posts";
const API_SOC   = "/.netlify/functions/socials";
const API_LINK  = "/.netlify/functions/linkcheck";
const API_ADM   = "/.netlify/functions/admins";

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
  app: "assets/images/trogh-app.png",
  movie: "assets/images/trogh-movies.png"
};
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
const fullCache = new Map();
const videoCache = new Map();

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
  try { const saved = JSON.parse(localStorage.getItem(LS_RECENTES)||"[]"); if(Array.isArray(saved)) recientes = saved; } catch (err) {}
  try { const savedS = JSON.parse(localStorage.getItem(LS_SOCIALS)||"[]"); if(Array.isArray(savedS)) socials = savedS; } catch (err) {}
  isAdmin = localStorage.getItem(LS_ADMIN) === "1";
  try { const t=localStorage.getItem("tgx_admin_token"); if(!isAdmin && t && t.trim()) isAdmin=true; } catch (err) {}
}
rehydrate();

function persistAdmin(flag){ try{ localStorage.setItem(LS_ADMIN, flag ? "1" : "0"); }catch (err) {} }
function preload(src){ const img = new Image(); img.src = src; }

function toHex(buf){ const v=new Uint8Array(buf); return Array.from(v).map(b=>b.toString(16).padStart(2,"0")).join(""); }
async function sha256(str){ const enc=new TextEncoder().encode(str); const digest=await crypto.subtle.digest("SHA-256",enc); return toHex(digest); }
function genSaltHex(len=16){ const a=new Uint8Array(len); crypto.getRandomValues(a); return Array.from(a).map(b=>b.toString(16).padStart(2,"0")).join(""); }
async function hashCreds(user,pin,salt){ const key=`${user}::${pin}::${salt}`; return sha256(key); }

/* =========================
   API: Posts
   ========================= */
async function apiList(category = window.currentCategory) {
  const qs = new URLSearchParams({ lite: "1", limit: "200", category });
  const r = await fetch(`${API_POSTS}?${qs.toString()}`, { cache: "no-store" });
  if (!r.ok) throw new Error("No se pudo listar posts");
  const j = await r.json();
  return Array.isArray(j)?j.map(g=>({...g,link_ok:Boolean(g.link_ok),drive_id:g.drive_id||extractDriveId(g.first_link)})):j;
}
async function apiCreate(data, token){
  const r = await fetch(API_POSTS, {
    method:"POST",
    headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${token||""}` },
    body: JSON.stringify(data)
  });
  if(!r.ok){ const t=await r.text().catch(()=> ""); throw new Error(`Crear falló: ${r.status} ${r.statusText} :: ${t}`); }
  return r.json();
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
  return r.json();
}
async function apiDelete(id, token){
  const r = await fetch(`${API_POSTS}/${id}`, { method:"DELETE", headers:{ "Authorization":`Bearer ${token||""}` } });
  if(!r.ok){ const t=await r.text().catch(()=> ""); throw new Error(`Delete falló: ${t}`); }
  fullCache.delete(id); videoCache.delete(id);
  return r.json();
}

/* =========================
   API: Socials
   ========================= */
async function socialsList(){
  const r = await fetch(API_SOC);
  if(!r.ok) throw new Error("No se pudo listar socials");
  return r.json();
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
  const status = pager.querySelector(".pg-status");
  const prev   = pager.querySelector(".prev");
  const next   = pager.querySelector(".next");

  status.textContent = `Página ${page} / ${totalPages}`;
  prev.disabled = page<=1;
  next.disabled = page>=totalPages;

  prev.onclick = ()=>{ if(page>1){ page--; renderRow(true); } };
  next.onclick = ()=>{ if(page<totalPages){ page++; renderRow(true); } };

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
}

/* =========================
   HERO simple
   ========================= */
function renderHeroCarousel(){
  const hero = document.querySelector(".hero");
  if(!hero) return;
  const sideAds = document.querySelectorAll(".business-slot-left, .business-slot-right");
  if(sideAds.length === 0) hero.classList.add("hero--simple");
  const heroArt = hero.querySelector(".hero-art");
  const heroCarousel = hero.querySelector(".hero-carousel");
  if(heroArt) heroArt.style.display="none";
  if(heroCarousel) heroCarousel.innerHTML="";
}

/* =========================
   Modal ver juego (carga detalle al abrir) — SIN imagen
   ========================= */
async function openGameLazy(game){
  let data = game;
  try{
    const full = await apiGet(game.id);
    data = { ...game, ...full };
  }catch(err){
    console.error("[openGameLazy] detalle falló", err);
  }
  openGame(data);
}
function openGame(game){
  const modal = modalTemplate.content.cloneNode(true);
  const modalNode    = modal.querySelector(".tw-modal");
  const modalContent = modal.querySelector(".tw-modal-content");
  const modalTitle   = modal.querySelector(".tw-modal-title");
  const modalDesc    = modal.querySelector(".tw-modal-description");
  const modalClose   = modal.querySelector(".tw-modal-close");

  if(modalTitle) modalTitle.textContent = game?.title || "Sin título";
  if(modalDesc){
    modalDesc.innerHTML = game?.description || "Sin descripción";
    modalDesc.querySelectorAll("a.chip-gofile").forEach(a => {
      const id = extractGofileId(a.getAttribute("href"));
      if(id){
        a.addEventListener("click", ev => {
          ev.preventDefault();
          openGofileFolder(id, game?.title || "");
        });
        a.removeAttribute("target");
        a.href = "#";
      }
    });
    modalDesc.querySelectorAll("a.chip-drive").forEach(a => {
      const id = extractDriveId(a.getAttribute("href"));
      if(id){
        a.addEventListener("click", ev => {
          ev.preventDefault();
          downloadFromDrive({ id, name: game?.title || a.textContent || "" });
        });
        a.removeAttribute("target");
        a.href = "#";
      }
    });
  }

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
      if(action==="edit"){ panel.classList.remove("show"); openEditGame(game); }
      if(action==="delete"){
        panel.classList.remove("show");
        if(confirm("¿Eliminar esta publicación?")) deleteGame(game);
      }
    });

    if(modalContent){
      modalContent.appendChild(kebabBtn);
      modalContent.appendChild(panel);
    }
  }

  const removeTrap = trapFocus(modalNode);
  const onEscape   = (e)=>{ if(e.key==="Escape") closeModal(modalNode, removeTrap, onEscape); };
  if(modalClose) modalClose.addEventListener("click", ()=> closeModal(modalNode, removeTrap, onEscape));
  openModalFragment(modalNode);

  const discord = socials.find(s => /discord/i.test(s.name || s.url));
  if(discord && modalContent){
    const link = document.createElement("a");
    link.className = "discord-link";
    link.href = discord.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const img = document.createElement("img");
    img.src = discord.image;
    img.alt = discord.name || "Discord";
    link.appendChild(img);
    modalContent.appendChild(link);

    const bubble = document.createElement("div");
    bubble.className = "discord-bubble";
    bubble.textContent = "Preguntas?🤨 pásate por el Discord";
    modalContent.appendChild(bubble);

    requestAnimationFrame(()=>{
      bubble.classList.add("show");
      const hide = ()=> bubble.classList.remove("show");
      const t = setTimeout(hide, 5000);
      link.addEventListener("mouseenter", ()=>{ hide(); clearTimeout(t); });
    });
  }
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

  const editorRoot = fragment.querySelector(".rich-editor");
  const editorAPI  = initRichEditor(editorRoot);

  const catSel = makeCategorySelect(initial.category || "game");
  form.querySelector(".new-game-title")?.parentElement?.appendChild(catSel);

  if(trailerUrlInput){
    trailerUrlInput.value=""; trailerUrlInput.disabled=true;
    const label=trailerUrlInput.closest("label"); if(label) label.style.display="none";
  }

  if(titleInput) titleInput.value = initial.title || "";
  if(initial.description) editorAPI.setHTML(initial.description);
  if(imageInput && initial.image !== undefined) imageInput.required=false;

  return { node, form, titleInput, imageInput, trailerFileInput, modalClose, editorAPI, catSel };
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
  const { titleInput, imageInput, trailerFileInput, editorAPI, catSel } = refs;

  const title=(titleInput?.value||"").trim();
  const descHTML=editorAPI.getHTML();
  const imageFile=imageInput?.files?.[0] || null;
  const trailerFile=trailerFileInput?.files?.[0] || null;
  const category = catSel.querySelector(".cat-select")?.value || "game";

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

  return { title, descHTML, coverDataUrl, thumbDataUrl, previewSrc, category, first_link, link_ok, gofile_id, drive_id };
}

function openNewGameModal(){
  const refs = initGameModal();
  const { node, form, titleInput, imageInput, trailerFileInput, modalClose, editorAPI, catSel } = refs;

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
  const { node, form, titleInput, imageInput, trailerFileInput, modalClose, editorAPI, catSel  } = refs;

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

    const patch={ title: data.title, description: data.descHTML, category: data.category, first_link: data.first_link, link_ok: data.link_ok, gofile_id: data.gofile_id, drive_id: data.drive_id };

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
        socials = await socialsList();
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
        try{ const token=localStorage.getItem("tgx_admin_token")||""; await socialsDelete(s.id, token); socials=await socialsList(); renderSocialBar(); }
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
  const btn=document.querySelector('.dmca-btn');
  if(!btn) return;
  btn.addEventListener('click', ()=>{
    openDmcaModal();
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

function setupAdminButton(){
  const btn=document.querySelector(".user-pill");
  if(!btn) return;
  btn.title = isAdmin ? "Cerrar sesión de administrador" : "Iniciar sesión de administrador";
  btn.onclick = ()=>{
    if(isAdmin){
      openAdminMenuModal();
    } else {
      openAdminLoginModal();
    }
  };
}

/* =========================␊
   Badge lateral → Descargas
   ========================= */
function ensureDownloadsBadge(){
  const rail = document.querySelector(".side-nav");
  if(!rail) return;

  let el = rail.querySelector(".yt-channel-badge");

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
    const img = document.createElement("img");
    img.src = "assets/images/youtube-channel.png";
    img.alt = "Descargas";
    el.appendChild(img);
    rail.appendChild(el);
  }
  el.onclick = toggleDownloadsPanel;
  return el;
}
function toggleDownloadsPanel(){
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

  const render = () => {
    const desc = panel.querySelector('.downloads-content');
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
        speedEl.textContent = '0 MB/s';
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.classList.add('cancel-btn');
        cancelBtn.textContent = 'Cancelar';
        cancelBtn.addEventListener('click', () => { dl.cancel && dl.cancel(); li.remove(); });
        status.append(pct, speedEl, cancelBtn);
        li.append(name, prog, status);
        aList.appendChild(li);
        dl.onupdate = () => {
          prog.max = dl.total || 1;
          prog.value = dl.loaded;
          pct.textContent = dl.total ? `${Math.floor((dl.loaded/dl.total)*100)}%` : '0%';
          speedEl.textContent = (dl.speed/1_000_000).toFixed(2)+' MB/s';
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
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.textContent = 'Reintentar';
        retry.addEventListener('click', ev => {
          ev.preventDefault();
          if (d.platform === 'drive') downloadFromDrive({ id: d.id, name: d.name });
          else downloadFromGofile(d);
        });
        status.appendChild(retry);
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
          render();
        });
        desc.appendChild(tBtn);
      }
    } else if(!activeDownloads.length) {
      desc.textContent = 'No hay descargas.';
    }
  };

  panel.querySelector('.clear-history').onclick = () => {
    localStorage.removeItem('tgx_downloads');
    render();
  };

  if(panel.classList.contains('open')){
    panel.classList.remove('open');
    return;
  }

  render();
  panel.classList.add('open');
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

async function downloadFromDrive(input){
  try {
    let parts = Array.isArray(input) ? input : input?.parts;
    let id    = Array.isArray(input) ? input[0]?.id : input?.id;
    const name = Array.isArray(input) ? (input[0]?.name || 'Archivo') : (input?.name || 'Archivo');
    if(!parts){
      if(!id) throw new Error('missing id');
      const meta = await fetch(`/.netlify/functions/drive?id=${encodeURIComponent(id)}`);
      if(!meta.ok) throw new Error('meta failed');
      const m = await meta.json();
      const total = parseInt(m.size || '0', 10);
      const chunk = 2 * 1024 * 1024; // 2MB
      const count = total ? Math.ceil(total/chunk) : 1;
      parts = Array.from({length:count}, (_,i)=>{
        const start = i*chunk;
        const end = total ? Math.min(total-1,(i+1)*chunk-1) : undefined;
        const endParam = end!=null ? `&end=${end}` : '';
        const url = `/.netlify/functions/drive?dl=${encodeURIComponent(id)}&start=${start}${endParam}`;
        return { url, start, end };
      });
    }
    const controller = new AbortController();
    let writer;
    let writerClosed = false;
    const dl = { id, name, total:0, loaded:0, progress:0, completed:[], status:'downloading', speed:0, onupdate:null };
    dl.cancel = () => {
      controller.abort();
      if (writer && !writerClosed) try { writer.abort(); writerClosed = true; } catch (err) {}
      dl.status = 'canceled';
      const i = activeDownloads.indexOf(dl);
      if (i >= 0) activeDownloads.splice(i, 1);
    };
    activeDownloads.push(dl);

    const stateKey = `tgx_drive_${id}`;
    try{
      const saved = JSON.parse(localStorage.getItem(stateKey)||'{}');
      if(Array.isArray(saved.completed)) dl.completed = saved.completed;
      if(typeof saved.loaded === 'number') dl.loaded = saved.loaded;
    }catch(err){ /* ignore */ }

    dl.total = parts.reduce((s,p)=> s + ((p.end!=null?p.end:p.start) - (p.start||0) + 1),0);
    const fileStream = streamSaver.createWriteStream(name, { size: dl.total });
    writer = fileStream.getWriter();

    let lastTime = performance.now(), lastLoaded = dl.loaded;
    const persist=()=>{ try{ localStorage.setItem(stateKey, JSON.stringify({ completed: dl.completed, loaded: dl.loaded })); }catch(err){} };
    const emit=()=>{
      dl.progress = dl.total ? dl.loaded / dl.total : 0;
      const now = performance.now();
      dl.speed = (dl.loaded - lastLoaded) / ((now - lastTime)/1000);
      lastTime = now;
      lastLoaded = dl.loaded;
      dl.onupdate && dl.onupdate(dl);
    };

    async function fetchPart(part, idx){
      if(dl.completed[idx]) return [];
      const maxRetries = 3;
      for(let attempt=0; attempt<maxRetries; attempt++){
        try{
          const res = await fetch(part.url, { signal: controller.signal });
          if(!res.ok) throw new Error(`HTTP ${res.status}`);
          const reader = res.body.getReader();
          const chunks = [];
          while(true){
            const {done,value} = await reader.read();
            if(done) break;
            chunks.push(value);
            dl.loaded += value.length;
            persist();
            emit();
          }
          dl.completed[idx] = true;
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
    const concurrency = 4;
    let nextIndex = 0;
    const results = new Array(parts.length);
    const workers = Array.from({ length: concurrency }, async () => {
      while(nextIndex < parts.length){
        const idx = nextIndex++;
        results[idx] = await fetchPart(parts[idx], idx);
      }
    });
    await Promise.all(workers);
    for (let i = 0; i < results.length; i++) {
      const partChunks = results[i];
      if(!partChunks) continue;
      for (const chunk of partChunks) {
        await writer.write(chunk);
      }
    }
    await writer.close();
    writerClosed = true;
    localStorage.removeItem(stateKey);
    const hist = JSON.parse(localStorage.getItem('tgx_downloads')||'[]');
    hist.unshift({ id, name, date: Date.now(), platform:'drive' });
    hist.splice(50);
    localStorage.setItem('tgx_downloads', JSON.stringify(hist));
    dl.status='done';
    const idx = activeDownloads.indexOf(dl);
    if(idx>=0) activeDownloads.splice(idx,1);
    emit();
  } catch(err){
    console.error('[downloadFromDrive]', err);
    if(writer && !writerClosed){ try{ await writer.abort(); }catch(_){ } }
    alert('No se pudo descargar');
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
  try{ const data=await apiList(window.currentCategory); recientes=Array.isArray(data)?data:[]; }
  catch(e){ console.error("[reload posts]", e); recientes=[]; }
  renderRow();
  renderHeroCarousel();
}
async function initData(){
  try{ const data=await apiList(window.currentCategory); recientes=Array.isArray(data)?data:[];
  }catch(e){ console.error("[initData posts]", e); recientes=[]; }
  try{ socials=await socialsList(); }catch(e){ console.error("[initData socials]", e); socials=[]; }

  renderRow();
  setupSearch();
  setupDmcaButton();
  setupAdminButton();
  renderHeroCarousel();
  renderSocialBar();
  setupSideNav();
}
recalcPageSize();
window.addEventListener('resize', ()=>{ recalcPageSize(); renderRow(); });
initData();












































