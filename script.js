/* === CONSTANTES / TEMPLATES === */
const template = document.getElementById("tile-template");
const modalTemplate = document.getElementById("game-modal-template");
const adminLoginModalTemplate = document.getElementById("admin-login-modal-template");
const newGameModalTemplate = document.getElementById("new-game-modal-template");
const newSocialModalTemplate = document.getElementById("new-social-modal-template");

/* === STORAGE KEYS === */
const LS_RECENTES = "tgx_recientes";
const LS_ADMIN = "tgx_is_admin";
const LS_ADMIN_HASH = "tgx_admin_hash";
const LS_ADMIN_SALT = "tgx_admin_salt";
const LS_ADMIN_USER = "tgx_admin_user";
const LS_SOCIALS = "tgx_socials";

/* === ENDPOINTS === */
const API_POSTS = "/.netlify/functions/posts";
const API_SOC   = "/.netlify/functions/socials";
const API_LINK  = "/.netlify/functions/linkcheck";

/* === CATEGORÍAS === */
let currentCategory = "game"; // "game" | "app" | "movie"

/* === API POSTS === */
async function apiList(category = currentCategory) {
  const qs = new URLSearchParams({ lite: "1", limit: "100" });
  if (category) qs.set("category", category);
  const r = await fetch(`${API_POSTS}?${qs.toString()}`, { cache: "no-store" });
  if (!r.ok) throw new Error("No se pudo listar posts");
  return r.json();
}
async function apiListFeatured(category = currentCategory) {
  const qs = new URLSearchParams({ featured: "1", limit: "10" });
  if (category) qs.set("category", category);
  const r = await fetch(`${API_POSTS}?${qs.toString()}`, { cache: "no-store" });
  if (!r.ok) return [];
  return r.json();
}
async function apiCreate(game, token) {
  const r = await fetch(API_POSTS, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token||""}` },
    body: JSON.stringify(game)
  });
  if (!r.ok) {
    const t = await r.text().catch(()=> "");
    throw new Error(`Crear falló: ${r.status} ${r.statusText} :: ${t}`);
  }
  return r.json();
}
async function apiDelete(id, token) {
  const r = await fetch(`${API_POSTS}/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token||""}` } });
  if (!r.ok) { const t = await r.text().catch(()=> ""); throw new Error(`Delete falló: ${t}`); }
  return r.json();
}
async function apiGet(id) {
  const r = await fetch(`${API_POSTS}/${id}`, { cache: "no-store" });
  if (!r.ok) throw new Error("No se pudo obtener el post");
  return r.json();
}
async function apiUpdate(id, data, token){
  const r = await fetch(`${API_POSTS}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token||""}` },
    body: JSON.stringify(data)
  });
  if(!r.ok){ const t = await r.text().catch(()=> ""); throw new Error(`Update falló: ${t}`); }
  return r.json();
}
async function apiClearFeatured(token){
  const r = await fetch(`${API_POSTS}?action=clear_featured`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token||""}` }
  });
  if(!r.ok){ const t = await r.text().catch(()=> ""); throw new Error(`Clear featured falló: ${t}`); }
  return r.json();
}

/* === API SOCIALS === */
async function socialsList(){
  const r = await fetch(API_SOC, { cache: "no-store" });
  if(!r.ok) throw new Error("No se pudo listar socials");
  return r.json();
}
async function socialsCreate(s, token){
  const r = await fetch(API_SOC, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token||""}` },
    body: JSON.stringify(s)
  });
  if(!r.ok) { const t = await r.text().catch(()=> ""); throw new Error(`Social crear falló: ${t}`); }
  return r.json();
}
async function socialsDelete(id, token){
  const r = await fetch(`${API_SOC}/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token||""}` } });
  if(!r.ok) { const t = await r.text().catch(()=> ""); throw new Error(`Social delete falló: ${t}`); }
  return r.json();
}

/* === STATE === */
let isAdmin = false;
let recientes = [];
let socials  = [];

/* === REHYDRATE === */
rehydrate();
function rehydrate() {
  try { const saved = JSON.parse(localStorage.getItem(LS_RECENTES)||"[]"); if(Array.isArray(saved)) recientes = saved; } catch {}
  try { const savedS = JSON.parse(localStorage.getItem(LS_SOCIALS)||"[]"); if(Array.isArray(savedS)) socials = savedS; } catch {}
  isAdmin = localStorage.getItem(LS_ADMIN) === "1";
  try { const tok = localStorage.getItem("tgx_admin_token"); if (!isAdmin && tok && tok.trim()) isAdmin = true; } catch {}
}
function persistAdmin(flag){ try{ localStorage.setItem(LS_ADMIN, flag ? "1" : "0"); }catch{} }
function preload(src){ const img = new Image(); img.src = src; }

/* === MODALES === */
function openModalFragment(fragment){ document.body.appendChild(fragment); setTimeout(()=>fragment.classList.add("active"),0); }
function closeModal(modalNode, removeTrap, onEscape){
  modalNode.classList.remove("active");
  document.body.style.overflow = "";
  if(removeTrap) removeTrap();
  if(onEscape) modalNode.removeEventListener("keydown", onEscape);
  setTimeout(()=>{ try{ modalNode.remove(); }catch{} }, 300);
}
function trapFocus(modalNode){
  const selectors = ["a[href]","button:not([disabled])","textarea:not([disabled])","input:not([disabled])","select:not([disabled])","[tabindex]:not([tabindex='-1'])"];
  const getList = () => Array.from(modalNode.querySelectorAll(selectors.join(",")));
  function onKey(e){
    if(e.key !== "Tab") return;
    const items = getList(); if(!items.length) return;
    const first = items[0], last = items[items.length-1];
    if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
  }
  modalNode.addEventListener("keydown", onKey);
  return () => modalNode.removeEventListener("keydown", onKey);
}

/* === HELPERS IMAGEN/VIDEO === */
function normalizeVideoUrl(u){
  if(!u) return "";
  u = u.trim();
  if (/^https?:\/\//i.test(u) || /^\/\//.test(u)) return u;
  if (u.startsWith('/')) return u;
  if (u.startsWith('assets/')) return '/' + u;
  return u;
}
function readAsDataURL(file){
  return new Promise((resolve,reject)=>{
    const fr = new FileReader();
    fr.onload = ()=> resolve(fr.result);
    fr.onerror = ()=> reject(new Error("No se pudo leer el archivo"));
    fr.readAsDataURL(file);
  });
}
function dataUrlBytes(dataUrl){
  const i = dataUrl.indexOf(","); if(i === -1) return dataUrl.length;
  const b64 = dataUrl.slice(i+1);
  return Math.floor((b64.length * 3) / 4);
}
async function compressImage(file, {maxW=1280, maxH=1280, quality=0.82} = {}){
  const blobUrl = URL.createObjectURL(file);
  const img = await new Promise((res, rej)=>{
    const im = new Image();
    im.onload = ()=> res(im);
    im.onerror = ()=> rej(new Error("No se pudo cargar la imagen"));
    im.src = blobUrl;
  });
  let { width: w, height: h } = img;
  const ratio = Math.min(maxW / w, maxH / h, 1);
  const nw = Math.round(w * ratio);
  const nh = Math.round(h * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = nw; canvas.height = nh;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, nw, nh);
  const out = canvas.toDataURL("image/jpeg", quality);
  URL.revokeObjectURL(blobUrl);
  return out;
}

/* === LINKS / CHIPS === */
function platformFromUrl(u){
  const s = (u||"").toLowerCase();
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
  const text = (prompt("Nombre a mostrar del enlace:") || "").trim();
  if(!text) return;
  let url = (prompt("Pega la URL del enlace:") || "").trim();
  if(!url) return;
  if (!/^https?:\/\//i.test(url) && !url.startsWith("magnet:")) {
    url = "https://" + url;
  }
  const plat = platformFromUrl(url);
  const html = `<a href="${url.replace(/"/g,"&quot;")}" target="_blank" rel="noopener" class="link-chip chip-${plat}"><span class="chip-dot"></span>${text.replace(/[<>]/g,"")}</a>`;
  document.execCommand("insertHTML", false, html);
}
function extractFirstLink(html){
  const tmp = document.createElement("div");
  tmp.innerHTML = html || "";
  const a = tmp.querySelector("a[href]");
  return a ? a.getAttribute("href") : "";
}
const linkCache = new Map();
async function checkLink(url){
  if(!url) return { ok:false, status:null };
  if(linkCache.has(url)) return linkCache.get(url);
  try{
    const r = await fetch(`${API_LINK}?url=${encodeURIComponent(url)}`, { cache:"no-store" });
    const j = await r.json();
    const val = { ok: !!j.ok, status: j.status ?? null };
    linkCache.set(url, val);
    return val;
  }catch{ return { ok:false, status:null }; }
}
function platformIconSVG(plat){
  const sz = 12; const common = `width="${sz}" height="${sz}" viewBox="0 0 24 24" aria-hidden="true"`;
  switch(plat){
    case "mega": return `<svg ${common} fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm5 15h-2v-4l-3 3-3-3v4H7V7h2l3 3 3-3h2v10z"/></svg>`;
    case "mediafire": return `<svg ${common} fill="currentColor"><path d="M3 15a6 6 0 0 1 6-6h10a2 2 0 0 1 0 4h-6a6 6 0 0 1-10 2z"/></svg>`;
    case "drive": return `<svg ${common} fill="currentColor"><path d="M10 4h4l6 10-2 4H6l-2-4 6-10zm1 2-5 8h12l-5-8h-2z"/></svg>`;
    case "dropbox": return `<svg ${common} fill="currentColor"><path d="m6 3 6 4-4 3-6-4 4-3Zm6 4 6-4 4 3-6 4-4-3Zm-10 6 6 4 4-3-6-4-4 3Zm10 1 4 3 6-4-4-3-6 4Z"/></svg>`;
    case "onedrive": return `<svg ${common} fill="currentColor"><path d="M7 17h10a4 4 0 0 0 0-8 5 5 0 0 0-9-2 5 5 0 0 0-1 10Z"/></svg>`;
    case "youtube": return `<svg ${common} fill="currentColor"><path d="M10 15l5-3-5-3v6zm12-3c0-2.2-.2-3.7-.6-4.7-.3-.8-1-1.5-1.8-1.8C18.6 4 12 4 12 4s6.6 0 7.6.5c.8-.3 1.5-1 1.8-1.8.4-1 .6-2.5.6-4.7z"/></svg>`;
    case "torrent": return `<svg ${common} fill="currentColor"><path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm1 5v6h3l-4 4-4-4h3V7h2z"/></svg>`;
    case "gofile": return `<svg ${common} fill="currentColor"><circle cx="12" cy="12" r="9"/></svg>`;
    case "pixeldrain": return `<svg ${common} fill="currentColor"><path d="M4 4h16v16H4z"/></svg>`;
    default: return `<svg ${common} fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>`;
  }
}

/* === RICH EDITOR === */
function initRichEditor(editorRoot){
  const editorArea = editorRoot.querySelector(".editor-area");
  const toolbar = editorRoot.querySelector(".rich-toolbar");

  // Alineación
  if (!toolbar.querySelector(".rtb-align")) {
    const group = document.createElement("div");
    group.className = "rtb-group";
    group.innerHTML = `
      <button type="button" class="rtb-btn rtb-align" data-align="left"   title="Alinear izquierda">⟸</button>
      <button type="button" class="rtb-btn rtb-align" data-align="center" title="Centrar">⟺</button>
      <button type="button" class="rtb-btn rtb-align" data-align="right"  title="Alinear derecha">⟹</button>
    `;
    toolbar.appendChild(group);
  }

  function exec(cmd,v=null){ document.execCommand(cmd,false,v); editorArea.focus(); }
  toolbar.addEventListener("click",(e)=>{
    const btn = e.target.closest(".rtb-btn"); if(!btn) return;
    const { cmd, block, list, align } = btn.dataset;
    if(cmd) exec(cmd);
    if(block) exec("formatBlock", block);
    if(list==="ul") exec("insertUnorderedList");
    if(btn.classList.contains("rtb-link")) insertLinkChip(editorArea);
    if(align){
      if(align==="left")   exec("justifyLeft");
      if(align==="center") exec("justifyCenter");
      if(align==="right")  exec("justifyRight");
    }
  });

  const fontSel = toolbar.querySelector(".rtb-font");
  if(fontSel){ fontSel.addEventListener("change", ()=>{ const v=fontSel.value.trim(); if(v) exec("fontName", v); else editorArea.focus(); }); }

  return { getHTML: ()=>editorArea.innerHTML.trim(), setHTML: (h)=>{ editorArea.innerHTML = h||""; } };
}

/* === BADGE ESTADO === */
async function applyLinkStatusBadge(tile, game){
  let badge = tile.querySelector(".tile-info .badge");
  if(!badge){
    badge = document.createElement("span");
    badge.className = "badge";
    tile.querySelector(".tile-info")?.appendChild(badge);
  }
  const url = extractFirstLink(game.description || "");
  const plat = platformFromUrl(url);
  const platformClass = `pill-${plat}`;

  badge.className = `badge badge-status status-checking ${platformClass}`;
  badge.innerHTML = `<span class="pill-icon"></span><span class="pill-text">Comprobando…</span>`;
  badge.querySelector(".pill-icon").innerHTML = platformIconSVG(plat);

  if(!url){
    badge.className = `badge badge-status status-warn ${platformClass}`;
    badge.querySelector(".pill-text").textContent = "Sin enlace";
    return;
  }
  try{
    const res = await checkLink(url);
    const ok = !!res.ok;
    badge.classList.remove("status-checking","status-warn","status-down","status-ok");
    if (ok){
      badge.classList.add("status-ok");
      badge.querySelector(".pill-text").textContent = "Disponible";
    } else {
      badge.classList.add("status-warn");
      badge.querySelector(".pill-text").textContent = "Revisar enlace";
    }
  }catch{
    badge.classList.remove("status-checking");
    badge.classList.add("status-warn");
    badge.querySelector(".pill-text").textContent = "Revisar enlace";
  }
}

/* === RENDER ROW === */
function renderRow(){
  const container = document.querySelector(`.carousel[data-row="recientes"]`);
  if(!container) return;
  container.innerHTML = "";

  recientes.forEach((g)=>{
    const node = template.content.cloneNode(true);
    const tile = node.querySelector(".tile");
    const cover = node.querySelector(".cover");
    const title = node.querySelector(".title");
    const vid   = node.querySelector(".tile-video");

    cover.style.backgroundImage = `url(${g.image})`;
    preload(g.image);
    title.textContent = g.title || "";

    if (vid) {
      let loaded = false;
      vid.poster = g.image;
      vid.muted = true; vid.loop = true; vid.playsInline = true;
      vid.setAttribute("muted",""); vid.setAttribute("playsinline","");
      vid.preload = "metadata";
      const sourceEl = vid.querySelector("source");
      const ensureSrc = async () => {
        if (loaded) return true;
        let pv = g.previewVideo || g.preview_video || "";
        if (!pv && g.id) {
          try { const full = await apiGet(g.id); pv = full.previewVideo || full.preview_video || ""; if (pv) g.previewVideo = pv; } catch {}
        }
        if (!pv) return false;
        if (sourceEl) { sourceEl.src = pv; vid.load(); } else { vid.src = pv; }
        loaded = true; return true;
      };
      const start = async ()=>{ const ok = await ensureSrc(); if(!ok) return; vid.currentTime = 0; const p=vid.play(); if(p&&p.catch) p.catch(()=>{}); };
      const stop  = ()=>{ vid.pause(); vid.currentTime = 0; };
      const show  = ()=>vid.classList.add("playing");
      const hide  = ()=>vid.classList.remove("playing");
      vid.addEventListener("playing", show);
      vid.addEventListener("pause", hide);
      vid.addEventListener("ended", hide);
      vid.addEventListener("error", ()=>{ vid.remove(); });
      tile.addEventListener("pointerenter", start);
      tile.addEventListener("pointerleave", stop);
      tile.addEventListener("focus", start);
      tile.addEventListener("blur", stop);
    }

    tile.tabIndex = 0;
    tile.addEventListener("click", ()=>openGame(g));
    container.appendChild(node);

    applyLinkStatusBadge(tile, g);
  });

  if(isAdmin){
    const addTile = document.createElement("div");
    addTile.className = "add-game-tile";
    addTile.tabIndex = 0;
    addTile.innerHTML = "<span>+ Añadir juego</span>";
    addTile.addEventListener("click", openNewGameModal);
    container.insertBefore(addTile, container.firstChild);
  }
}

/* === FEATURED (HERO) === */
function getFeatured(list){
  return list
    .filter(p => Number.isFinite(p.featured_rank))
    .sort((a,b)=> (a.featured_rank||99) - (b.featured_rank||99));
}

// HERO sin destacados: solo leyenda + barra de redes
async function renderHeroCarousel(){
  const hero = document.querySelector(".hero");
  const heroArt = document.querySelector(".hero-art");
  const heroCarousel = document.querySelector(".hero-carousel");
  if(!hero) return;

  // Forzamos modo simple
  hero.classList.add("hero--simple");
  if (heroArt) heroArt.style.display = "none";
  if (heroCarousel) heroCarousel.innerHTML = "";
}

  // etiqueta y botón limpiar
  let tag = heroArt.querySelector(".hero-label");
  if (!tag) { tag = document.createElement("span"); tag.className = "hero-label"; tag.textContent = "Destacados"; heroArt.appendChild(tag); }

  let actions = heroArt.querySelector(".hero-actions");
  if (!actions) { actions = document.createElement("div"); actions.className = "hero-actions"; heroArt.appendChild(actions); }
  actions.innerHTML = "";
  if (isAdmin) {
    const btnClear = document.createElement("button");
    btnClear.className = "btn-clear-featured";
    btnClear.textContent = "Limpiar destacados";
    btnClear.addEventListener("click", async (e)=>{
      e.stopPropagation();
      if (!confirm("¿Quitar TODOS los destacados?")) return;
      const token = localStorage.getItem("tgx_admin_token") || "";
      try { await apiClearFeatured(token); await reloadData(); alert("Destacados limpiados."); }
      catch(err){ console.error(err); alert("No se pudo limpiar."); }
    });
    actions.appendChild(btnClear);
  }

  const setActive = (i)=>{
    const imgs = heroCarousel.querySelectorAll("img");
    imgs.forEach((im,idx)=>im.classList.toggle("active", idx===i));
    heroArt.style.backgroundImage = `url(${source[i]?.image||""})`;
  };
  const getActiveIndex = ()=> Array.from(heroCarousel.querySelectorAll("img")).findIndex(im=>im.classList.contains("active"));
  setActive(0);
  heroArt.addEventListener("click", ()=>{ const i=getActiveIndex(); openGame(source[i>=0?i:0]); });
heroArt.addEventListener("keydown",(e)=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); const i=getActiveIndex(); openGame(source[i>=0?i:0]); }});

/* === MODAL VER === */
function openGame(game){
  const modal = modalTemplate.content.cloneNode(true);
  const modalNode = modal.querySelector(".tw-modal");
  const modalContent = modal.querySelector(".tw-modal-content");
  const modalImage = modal.querySelector(".tw-modal-image");
  const modalTitle = modal.querySelector(".tw-modal-title");
  const modalDescription = modal.querySelector(".tw-modal-description");
  const modalClose = modal.querySelector(".tw-modal-close");

  modalImage.src = game.image || "assets/images/construction/en-proceso.svg";
  modalTitle.textContent = game.title || "Sin título";
  modalDescription.innerHTML = game.description || "Sin descripción";

  if(isAdmin){
    const kebabBtn = document.createElement("button");
    kebabBtn.className = "tw-modal-menu";
    kebabBtn.innerHTML = "⋮";
    const panel = document.createElement("div");
    panel.className = "tw-kebab-panel";
    panel.innerHTML = `
      <button class="tw-kebab-item" data-action="edit">Editar</button>
      <button class="tw-kebab-item danger" data-action="delete">Eliminar</button>
    `;
    kebabBtn.addEventListener("click",(e)=>{ e.stopPropagation(); panel.classList.toggle("show"); });
    document.addEventListener("click",(e)=>{ if(!panel.contains(e.target) && e.target!==kebabBtn) panel.classList.remove("show"); });
    panel.addEventListener("click",(e)=>{
      const action = e.target?.dataset?.action;
      if(action==="edit"){ panel.classList.remove("show"); openEditGame(game, modalNode); }
      if(action==="delete"){
        panel.classList.remove("show");
        if(confirm("¿Eliminar esta publicación?")) deleteGame(game, modalNode);
      }
    });
    modalContent.appendChild(kebabBtn);
    modalContent.appendChild(panel);
  }

  const removeTrap = trapFocus(modalNode);
  const onEscape = (e)=>{ if(e.key==="Escape") closeModal(modalNode, removeTrap, onEscape); };
  modalClose.addEventListener("click", ()=> closeModal(modalNode, removeTrap, onEscape));
  openModalFragment(modalNode);
}

/* === CRUD === */
function deleteGame(game, currentModalNode){
  if(!game.id){ alert("No se encontró ID."); return; }
  const token = localStorage.getItem("tgx_admin_token") || "";
  if(!token){ alert("Falta AUTH_TOKEN. Inicia sesión admin y pégalo."); return; }
  apiDelete(game.id, token)
    .then(()=>reloadData())
    .then(()=>{ if(currentModalNode) closeModal(currentModalNode); alert("Publicación eliminada."); })
    .catch(e=>{ console.error(e); alert("Error al borrar."); });
}

function makeCategorySelect(current="game"){
  const wrap = document.createElement("label");
  wrap.style.display = "block";
  wrap.style.marginTop = ".6rem";
  wrap.innerHTML = `
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

function openEditGame(original){
  const modal = newGameModalTemplate.content.cloneNode(true);
  const node = modal.querySelector(".tw-modal");
  const form = modal.querySelector(".new-game-form");
  const titleInput = modal.querySelector(".new-game-title");
  const imageInput = modal.querySelector(".new-game-image-file");
  const trailerFileInput = modal.querySelector(".new-game-trailer-file");
  const trailerUrlInput = modal.querySelector(".new-game-trailer-url");
  const modalClose = modal.querySelector(".tw-modal-close");

  const editorRoot = modal.querySelector(".rich-editor");
  const editorAPI = initRichEditor(editorRoot);

  if (titleInput) titleInput.value = original.title || "";
  editorAPI.setHTML(original.description || "");

  // No pedimos URL de trailer: oculto/disabled
  if (trailerUrlInput) {
    trailerUrlInput.value = "";
    trailerUrlInput.disabled = true;
    const label = trailerUrlInput.closest("label");
    if (label) label.style.display = "none";
  }

  if (imageInput) imageInput.required = false;

  // Selector de categoría
  const catSel = makeCategorySelect(original.category || "game");
  form.querySelector(".new-game-title")?.parentElement?.appendChild(catSel);

  // Checkbox para quitar trailer
  let clearTrailerCb = null;
  {
    const trailerGroup = trailerFileInput?.closest("label")?.parentElement || form;
    const clearWrap = document.createElement("label");
    clearWrap.style.display = "inline-flex";
    clearWrap.style.alignItems = "center";
    clearWrap.style.gap = ".4rem";
    clearWrap.style.margin = ".4rem 0 0";
    clearWrap.innerHTML = `<input type="checkbox" class="clear-trailer"> Quitar trailer`;
    trailerGroup.appendChild(clearWrap);
    clearTrailerCb = clearWrap.querySelector(".clear-trailer");
  }

  const removeTrap = trapFocus(node);
  const onEscape = (e)=>{ if(e.key==="Escape") closeModal(node, removeTrap, onEscape); };

  form.addEventListener("submit", async (e)=>{
    e.preventDefault();

    const title = (titleInput?.value||"").trim();
    const descHTML = editorAPI.getHTML();
    const imageFile = imageInput?.files?.[0] || null;
    const trailerFile = trailerFileInput?.files?.[0] || null;
    const cat = catSel.querySelector(".cat-select")?.value || "game";

    if(!title){ alert("Título es obligatorio."); titleInput?.focus?.(); return; }
    if(!descHTML || !descHTML.replace(/<[^>]*>/g,'').trim()){ alert("Escribe una descripción."); return; }

    const patch = { title, description: descHTML, category: cat };

    if (imageFile) {
      try { patch.image = await compressImage(imageFile); }
      catch { alert("No se pudo leer/compactar la portada."); return; }
    }

    if (clearTrailerCb?.checked) {
      patch.previewVideo = null;
    } else if (trailerFile) {
      if (!/^video\/(mp4|webm)$/i.test(trailerFile.type)) { alert("Archivo del trailer debe ser MP4/WEBM."); return; }
      if (trailerFile.size > 6 * 1024 * 1024) { alert("Trailer >6MB. Usa URL o comprímelo."); return; }
      try { patch.previewVideo = await readAsDataURL(trailerFile); }
      catch { alert("No se pudo leer el trailer."); return; }
    }

    const token = localStorage.getItem("tgx_admin_token") || "";
    if(!token){ alert("Falta AUTH_TOKEN. Inicia sesión admin y pégalo."); return; }

    try{
      await apiUpdate(original.id, patch, token);
      const data = await apiList();
      recientes = Array.isArray(data)?data:[];
      const idx = recientes.findIndex(p=>p.id===original.id);
      if (idx > 0) { const [item] = recientes.splice(idx,1); recientes.unshift(item); }
      closeModal(node, removeTrap, onEscape);
      renderRow(); renderHeroCarousel();
      alert("¡Publicación actualizada!");
    }catch(err){ console.error(err); alert("Error al actualizar. Revisa consola."); }
  });

  modalClose.addEventListener("click",()=> closeModal(node, removeTrap, onEscape));
  openModalFragment(node);
}

function openNewGameModal(){
  const modal = newGameModalTemplate.content.cloneNode(true);
  const modalNode = modal.querySelector(".tw-modal");
  const form = modal.querySelector(".new-game-form");
  const titleInput = modal.querySelector(".new-game-title");
  const imageInput = modal.querySelector(".new-game-image-file");
  const trailerFileInput = modal.querySelector(".new-game-trailer-file");
  const trailerUrlInput = modal.querySelector(".new-game-trailer-url"); // la ocultamos/deshabilitamos
  const modalClose = modal.querySelector(".tw-modal-close");

  const editorRoot = modal.querySelector(".rich-editor");
  const editorAPI = initRichEditor(editorRoot);

  // Selector de categoría
  const catSel = makeCategorySelect("game");
  form.querySelector(".new-game-title")?.parentElement?.appendChild(catSel);

  // Ocultamos el campo "URL del trailer"
  if (trailerUrlInput) {
    trailerUrlInput.value = "";
    trailerUrlInput.disabled = true;
    const label = trailerUrlInput.closest("label");
    if (label) label.style.display = "none";
  }

  const removeTrap = trapFocus(modalNode);
  const onEscape = (e)=>{ if(e.key==="Escape") closeModal(modalNode, removeTrap, onEscape); };
  modalClose.addEventListener("click", ()=> closeModal(modalNode, removeTrap, onEscape));

  form.addEventListener("submit", async (e)=>{
    e.preventDefault();

    const title = (titleInput?.value||"").trim();
    const descHTML = editorAPI.getHTML();
    const imageFile = imageInput?.files?.[0] || null;
    const trailerFile = trailerFileInput?.files?.[0] || null;
    const cat = catSel.querySelector(".cat-select")?.value || "game";

    if(!title){ alert("Título es obligatorio."); titleInput?.focus?.(); return; }
    if(!descHTML || !descHTML.replace(/<[^>]*>/g,'').trim()){ alert("Escribe una descripción."); return; }
    if(!imageFile){ alert("Falta la imagen de portada."); return; }

    const payload = { title, description: descHTML, category: cat };

    try {
      payload.image = await compressImage(imageFile);
    } catch {
      alert("No se pudo leer/compactar la portada."); return;
    }

    // Solo aceptamos archivo de video (no URL)
    if (trailerFile) {
      if (!/^video\/(mp4|webm)$/i.test(trailerFile.type)) {
        alert("El trailer debe ser MP4/WEBM."); return;
      }
      if (trailerFile.size > 6 * 1024 * 1024) {
        alert("Trailer >6MB. Usa uno más ligero."); return;
      }
      try {
        payload.previewVideo = await readAsDataURL(trailerFile);
      } catch {
        alert("No se pudo leer el trailer."); return;
      }
    }

    const token = localStorage.getItem("tgx_admin_token") || "";
    if(!token){ alert("Falta AUTH_TOKEN. Inicia sesión admin y pégalo."); return; }

    try{
      await apiCreate(payload, token);
      await reloadData();
      closeModal(modalNode, removeTrap, onEscape);
      alert("¡Juego publicado!");
    }catch(err){
      console.error("[create error]", err);
      alert("Error al crear. Revisa consola.");
    }
  });

  openModalFragment(modalNode);
}

/* === SOCIALS === */
function openNewSocialModal(){
  const modal = newSocialModalTemplate.content.cloneNode(true);
  const modalNode = modal.querySelector(".tw-modal");
  const form = modal.querySelector(".new-social-form");
  const imageInput = modal.querySelector(".new-social-image-file");
  const urlInput   = modal.querySelector(".new-social-url");
  const nameInput  = modal.querySelector(".new-social-name");
  const modalClose = modal.querySelector(".tw-modal-close");

  const removeTrap = trapFocus(modalNode);
  const onEscape = (e)=>{ if(e.key==="Escape") closeModal(modalNode, removeTrap, onEscape); };

  form.addEventListener("submit",(e)=>{
    e.preventDefault();
    const file = imageInput?.files?.[0];
    const url  = (urlInput.value||"").trim();
    const name = (nameInput?.value||"").trim() || null;
    if(!file){ alert("Selecciona una imagen."); return; }
    if(!url){ alert("Coloca el enlace de la red."); urlInput.focus(); return; }

    const reader = new FileReader();
    reader.onload = async ()=>{
      try{
        const token = localStorage.getItem("tgx_admin_token") || "";
        await socialsCreate({ name, image: reader.result, url }, token);
        socials = await socialsList();
        renderSocialBar();
        closeModal(modalNode, removeTrap, onEscape);
      }catch(err){ console.error(err); alert("Error al guardar red social."); }
    };
    reader.readAsDataURL(file);
  });

  modalClose.addEventListener("click", ()=> closeModal(modalNode, removeTrap, onEscape));
  openModalFragment(modalNode);
}
function renderSocialBar(){
  const bar = document.querySelector(".social-bar");
  if(!bar) return;
  bar.innerHTML = "";
  socials.forEach((s)=>{
    const wrapper = document.createElement("div");
    wrapper.className = "social-tile-wrap";
    wrapper.style.position = "relative";
    wrapper.style.display = "inline-block";
    const a = document.createElement("a");
    a.href = s.url; a.target = "_blank"; a.rel = "noopener";
    const tile = document.createElement("div"); tile.className = "social-tile";
    const img = document.createElement("img"); img.src = s.image; img.className = "social-img";
    tile.appendChild(img); a.appendChild(tile); wrapper.appendChild(a);
    if (isAdmin && s.id) {
      const del = document.createElement("button");
      del.textContent = "×";
      del.title = "Eliminar";
      del.className = "social-del";
      del.addEventListener("click", async (e)=>{
        e.preventDefault(); e.stopPropagation();
        if (!confirm("¿Eliminar esta red social?")) return;
        try{
          const token = localStorage.getItem("tgx_admin_token") || "";
          await socialsDelete(s.id, token);
          socials = await socialsList();
          renderSocialBar();
        }catch(err){ console.error(err); alert("No se pudo eliminar."); }
      });
      wrapper.appendChild(del);
    }
    bar.appendChild(wrapper);
  });
  if (isAdmin) {
    const btn = document.createElement("button");
    btn.className = "add-social-tile";
    btn.textContent = "+";
    btn.addEventListener("click", openNewSocialModal);
    bar.appendChild(btn);
  }
}

/* === SEARCH / ARROWS / KEYBOARD === */
function setupSearch(){
  const input = document.getElementById("searchInput");
  if(!input) return;
  input.addEventListener("input", ()=>{
    const q = input.value.toLowerCase();
    const filtered = recientes.filter(g =>
      (g.title||"").toLowerCase().includes(q) ||
      (g.description||"").toLowerCase().includes(q)
    );
    const container = document.querySelector(`.carousel[data-row="recientes"]`);
    if(!container) return;
    container.innerHTML = "";
    filtered.forEach((g)=>{
      const node = template.content.cloneNode(true);
      const tile = node.querySelector(".tile");
      const cover = node.querySelector(".cover");
      const title = node.querySelector(".title");
      cover.style.backgroundImage = `url(${g.image})`;
      title.textContent = g.title;
      tile.addEventListener("click", ()=>openGame(g));
      container.appendChild(node);
    });
  });
}
function setupArrows(){
  const row  = document.querySelector(`.carousel[data-row="recientes"]`);
  const prev = document.querySelector(".arrow.prev");
  const next = document.querySelector(".arrow.next");
  if(!row || !prev || !next) return;

  const SCROLL_THRESHOLD = 18;

  const recalc = ()=>{
    const tiles = row.querySelectorAll(".tile");
    const addTile = row.querySelector(".add-game-tile");
    const count = tiles.length + (addTile ? 1 : 0);
    const hasOverflow = row.scrollWidth > row.clientWidth + 2;

    if (count >= SCROLL_THRESHOLD) {
      row.classList.add("scrollable");
    } else {
      row.classList.remove("scrollable");
    }

    const showArrows = hasOverflow || count >= SCROLL_THRESHOLD;
    prev.style.display = showArrows ? "" : "none";
    next.style.display = showArrows ? "" : "none";

    if (!showArrows) row.scrollLeft = 0;
  };

  prev.addEventListener("click", ()=> row.scrollBy({ left: -Math.max(400, row.clientWidth * 0.8), behavior: "smooth" }));
  next.addEventListener("click", ()=> row.scrollBy({ left:  Math.max(400, row.clientWidth * 0.8), behavior: "smooth" }));

  window.addEventListener("resize", recalc);
  new ResizeObserver(recalc).observe(row);
  new MutationObserver(recalc).observe(row, { childList: true });

  recalc();
}
function setupKeyboardNav(){
  const row = document.querySelector(`.carousel[data-row="recientes"]`);
  if(!row) return;
  row.addEventListener("keydown",(e)=>{
    if(e.key==="ArrowRight") row.scrollBy({ left: 200, behavior: "smooth" });
    if(e.key==="ArrowLeft")  row.scrollBy({ left: -200, behavior: "smooth" });
  });
}

/* === ADMIN LOGIN === */
function toHex(buf){ const v=new Uint8Array(buf); return Array.from(v).map(b=>b.toString(16).padStart(2,"0")).join(""); }
async function sha256(str){ const enc=new TextEncoder().encode(str); const digest=await crypto.subtle.digest("SHA-256",enc); return toHex(digest); }
function genSaltHex(len=16){ const a=new Uint8Array(len); crypto.getRandomValues(a); return Array.from(a).map(b=>b.toString(16).padStart(2,"0")).join(""); }
async function hashCreds(user,pin,salt){ return sha256(`${user}::${pin}::${salt}`); }

function openAdminLoginModal(){
  const modal = adminLoginModalTemplate.content.cloneNode(true);
  const node = modal.querySelector(".tw-modal");
  const form = modal.querySelector(".admin-login-form");
  const h2   = modal.querySelector(".tw-modal-title") || modal.querySelector("h2");
  const usernameInput = modal.querySelector(".admin-username");
  const pinInput = modal.querySelector(".admin-pin");
  const submitBtn = form.querySelector('button[type="submit"]');
  const modalClose = modal.querySelector(".tw-modal-close");

  const savedHash = localStorage.getItem(LS_ADMIN_HASH);
  const savedSalt = localStorage.getItem(LS_ADMIN_SALT);
  const savedUser = localStorage.getItem(LS_ADMIN_USER);
  const isFirstRun = !(savedHash && savedSalt && savedUser);

  if(isFirstRun){
    if(h2) h2.textContent = "Configurar administrador";
    if(submitBtn) submitBtn.textContent = "Crear y entrar";
    const confirmLabel = document.createElement("label");
    confirmLabel.innerHTML = `Confirmar PIN <input type="password" class="admin-pin2" required>
      <span class="input-hint">Repite el PIN (4 a 6 dígitos).</span>`;
    form.insertBefore(confirmLabel, form.querySelector(".tw-modal-actions") || form.lastElementChild);
  }

  const removeTrap = trapFocus(node);
  const onEscape = (e)=>{ if(e.key==="Escape") closeModal(node, removeTrap, onEscape); };
  modalClose.addEventListener("click", ()=> closeModal(node, removeTrap, onEscape));

  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const user = (usernameInput.value||"").trim();
    const pin  = (pinInput.value||"").trim();
    if(!user || !pin){ alert("Completa usuario y PIN."); return; }
    if(!/^[0-9]{4,6}$/.test(pin)){ alert("PIN debe ser 4 a 6 dígitos."); return; }

    if(isFirstRun){
      const pin2 = node.querySelector(".admin-pin2")?.value?.trim();
      if(pin!==pin2){ alert("Los PIN no coinciden."); return; }
      const salt = genSaltHex(16);
      const hash = await hashCreds(user,pin,salt);
      try{ localStorage.setItem(LS_ADMIN_HASH,hash); localStorage.setItem(LS_ADMIN_SALT,salt); localStorage.setItem(LS_ADMIN_USER,user); }catch{}
      isAdmin = true; persistAdmin(true);
      closeModal(node, removeTrap, onEscape);
      renderRow(); renderHeroCarousel(); renderSocialBar(); setupAdminButton();
      ensureAuthTokenPrompt();
      alert("Administrador configurado e iniciado.");
    } else {
      if(user!==savedUser){ alert("Usuario o PIN incorrectos."); return; }
      const hash = await hashCreds(user,pin,savedSalt);
      if(hash===savedHash){
        isAdmin = true; persistAdmin(true);
        closeModal(node, removeTrap, onEscape);
        renderRow(); renderHeroCarousel(); renderSocialBar(); setupAdminButton();
        ensureAuthTokenPrompt();
        alert("¡Sesión iniciada como admin!");
      } else { alert("Usuario o PIN incorrectos."); }
    }
  });

  openModalFragment(node);
}
function ensureAuthTokenPrompt(){
  try{
    const k="tgx_admin_token"; let t=localStorage.getItem(k);
    if(!t){ t = prompt("Pega tu AUTH_TOKEN de Netlify para crear/editar/borrar:"); if(t) localStorage.setItem(k, t.trim()); }
  }catch{}
}
function setupAdminButton(){
  const adminBtn = document.querySelector(".user-pill");
  if(!adminBtn) return;
  adminBtn.title = isAdmin ? "Cerrar sesión de administrador" : "Iniciar sesión de administrador";
  adminBtn.addEventListener("click", ()=>{
    if(isAdmin){
      if(confirm("¿Cerrar sesión de administrador?")){
        isAdmin = false; persistAdmin(false);
        renderRow(); renderHeroCarousel(); renderSocialBar();
        alert("Sesión cerrada.");
      }
    } else {
      openAdminLoginModal();
    }
  });
}

/* === SIDEBAR BADGE === */
function ensureSidebarChannelBadge(){
  const rail = document.querySelector(".sidebar, .side-rail, aside[aria-label='Sidebar'], aside") || null;
  if(!rail) return;
  const cs = getComputedStyle(rail);
  if (cs.position === "static") rail.style.position = "relative";
  let badge = rail.querySelector(".yt-channel-badge");
  if(!badge){
    badge = document.createElement("a");
    badge.className = "yt-channel-badge";
    badge.href = "https://youtube.com/@TU_CANAL";
    badge.target = "_blank"; badge.rel = "noopener";
    const img = document.createElement("img");
    img.src = "assets/images/youtube-channel.png";
    img.alt = "YouTube channel";
    badge.appendChild(img);
    rail.appendChild(badge);
  }
}

/* === NAV: Games / Apps / Movies === */
function setupCategoryNav(){
  const btnGames = document.querySelector('[data-nav="games"], .nav-games');
  const btnApps  = document.querySelector('[data-nav="apps"], .nav-apps');
  const btnMovies= document.querySelector('[data-nav="movies"], .nav-movies');

  function setActive(cat){
    currentCategory = cat;
    [btnGames, btnApps, btnMovies].forEach(b=>{
      if(!b) return;
      b.classList.toggle("active", (b===btnGames && cat==="game") || (b===btnApps && cat==="app") || (b===btnMovies && cat==="movie"));
    });
    reloadData();
  }

  if(btnGames) btnGames.addEventListener("click", ()=> setActive("game"));
  if(btnApps)  btnApps .addEventListener("click", ()=> setActive("app"));
  if(btnMovies)btnMovies.addEventListener("click", ()=> setActive("movie"));
}

/* === INIT / RELOAD === */
async function reloadData(){
  try{ const data = await apiList(currentCategory); recientes = Array.isArray(data)?data:[]; }
  catch(e){ console.error("[reload posts]", e); recientes = []; }
  renderRow(); setupArrows(); renderHeroCarousel();
}

async function initData(){
  try{ const data = await apiList(currentCategory); recientes = Array.isArray(data)?data:[]; }
  catch(e){ console.error("[initData posts]", e); recientes = []; }

  try{ socials = await socialsList(); }
  catch(e){ console.error("[initData socials]", e); socials = []; }

  renderRow();
  setupArrows();
  setupSearch();
  setupKeyboardNav();
  setupAdminButton();
  renderHeroCarousel();
  renderSocialBar();
  ensureSidebarChannelBadge();
  setupCategoryNav();
}
initData();
