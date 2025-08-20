// ===================== TEMPLATES =====================
const template = document.getElementById("tile-template");
const modalTemplate = document.getElementById("game-modal-template");
const adminLoginModalTemplate = document.getElementById("admin-login-modal-template");
const newGameModalTemplate = document.getElementById("new-game-modal-template");
const newSocialModalTemplate = document.getElementById("new-social-modal-template");

// ===================== LOCALSTORAGE KEYS =====================
const LS_RECENTES = "tgx_recientes";
const LS_ADMIN = "tgx_is_admin";
const LS_ADMIN_HASH = "tgx_admin_hash";
const LS_ADMIN_SALT = "tgx_admin_salt";
const LS_ADMIN_USER = "tgx_admin_user";
const LS_SOCIALS = "tgx_socials";

// ===================== API ENDPOINTS =====================
const API_POSTS = "/.netlify/functions/posts";
const API_SOC   = "/.netlify/functions/socials";
const API_LINK  = "/.netlify/functions/linkcheck";

// ---- POSTS
async function apiList() {
  const r = await fetch(`${API_POSTS}?lite=1&limit=24`, { cache: "no-store" });
  if (!r.ok) throw new Error("No se pudo listar posts");
  return r.json();
}
async function apiCreate(game, token) {
  const r = await fetch(API_POSTS, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token||""}` },
    body: JSON.stringify(game)
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function apiDelete(id, token) {
  const r = await fetch(`${API_POSTS}/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token||""}` } });
  if (!r.ok) throw new Error(await r.text());
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
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}

// ---- SOCIALS
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
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}
async function socialsDelete(id, token){
  const r = await fetch(`${API_SOC}/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token||""}` } });
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}

// ===================== STATE =====================
let isAdmin = false;
let recientes = [];
let socials  = [];

// ===================== UTIL / STORAGE =====================
rehydrate();
function rehydrate() {
  try { const saved = JSON.parse(localStorage.getItem(LS_RECENTES)||"[]"); if(Array.isArray(saved)) recientes = saved; } catch {}
  try { const savedS = JSON.parse(localStorage.getItem(LS_SOCIALS)||"[]"); if(Array.isArray(savedS)) socials = savedS; } catch {}
  isAdmin = localStorage.getItem(LS_ADMIN) === "1";
}
function persistAdmin(flag){ try{ localStorage.setItem(LS_ADMIN, flag ? "1" : "0"); }catch{} }
function preload(src){ const img = new Image(); img.src = src; }

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

// Helpers
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

// ====== Plataformas (chips/link + iconos + badge) ======
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
const linkCache = new Map(); // url -> {ok, status}
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
  const sz = 12;
  const common = `width="${sz}" height="${sz}" viewBox="0 0 24 24" aria-hidden="true"`;
  switch(plat){
    case "mega": return `<svg ${common} fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm5 15h-2v-4l-3 3-3-3v4H7V7h2l3 3 3-3h2v10z"/></svg>`;
    case "mediafire": return `<svg ${common} fill="currentColor"><path d="M3 15a6 6 0 0 1 6-6h10a2 2 0 0 1 0 4h-6a6 6 0 0 1-10 2z"/></svg>`;
    case "drive": return `<svg ${common} fill="currentColor"><path d="M10 4h4l6 10-2 4H6l-2-4 6-10zm1 2-5 8h12l-5-8h-2z"/></svg>`;
    case "dropbox": return `<svg ${common} fill="currentColor"><path d="m6 3 6 4-4 3-6-4 4-3Zm6 4 6-4 4 3-6 4-4-3Zm-10 6 6 4 4-3-6-4-4 3Zm10 1 4 3 6-4-4-3-6 4Z"/></svg>`;
    case "onedrive": return `<svg ${common} fill="currentColor"><path d="M7 17h10a4 4 0 0 0 0-8 5 5 0 0 0-9-2 5 5 0 0 0-1 10Z"/></svg>`;
    case "youtube": return `<svg ${common} fill="currentColor"><path d="M10 15l5-3-5-3v6zm12-3c0-2.2-.2-3.7-.6-4.7-.3-.8-1-1.5-1.8-1.8C18.6 4 12 4 12 4s-6.6 0-7.6.5c-.8-.3-1.5-1-1.8-1.8C2.2 8.3 2 9.8 2 12s.2 3.7.6 4.7c.3.8 1 1.5 1.8 1.8C5.4 19.9 12 20 12 20s6.6 0 7.6-.5c.8-.3 1.5-1 1.8-1.8.4-1 .6-2.5.6-4.7z"/></svg>`;
    case "torrent": return `<svg ${common} fill="currentColor"><path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm1 5v6h3l-4 4-4-4h3V7h2z"/></svg>`;
    case "gofile": return `<svg ${common} fill="currentColor"><circle cx="12" cy="12" r="9"/></svg>`;
    case "pixeldrain": return `<svg ${common} fill="currentColor"><path d="M4 4h16v16H4z"/></svg>`;
    default: return `<svg ${common} fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>`;
  }
}

// ===================== RICH EDITOR =====================
function initRichEditor(editorRoot){
  const editorArea = editorRoot.querySelector(".editor-area");
  con
