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
const LS_SOCIALS = "tgx_socials"; // fallback local (ya no se usa para persistir)

// ===================== API ENDPOINTS =====================
const API_POSTS = "/.netlify/functions/posts";
const API_SOC   = "/.netlify/functions/socials";

// ---- POSTS
async function apiList() {
  const r = await fetch(API_POSTS, { cache: "no-store" });
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

// ---- Helpers varios
function normalizeVideoUrl(u){
  if(!u) return "";
  u = u.trim();
  if (/^https?:\/\//i.test(u) || /^\/\//.test(u)) return u; // absoluta
  if (u.startsWith('/')) return u;                           // /assets/...
  if (u.startsWith('assets/')) return '/' + u;               // assets/... -> /assets/...
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

// ====== Link chip (detectar plataforma y aplicar clase) ======
function platformFromUrl(u){
  const s = (u||"").toLowerCase();
  if (s.startsWith("magnet:") || s.endsWith(".torrent")) return "torrent";
  if (s.includes("utorrent")) return "utorrent";
  if (s.includes("mega.nz")) return "mega";
  if (s.includes("mediafire.com")) return "mediafire";
  if (s.includes("drive.google.com")) return "drive";
  if (s.includes("dropbox.com")) return "dropbox";
  if (s.includes("1drv.ms") || s.includes("onedrive")) return "onedrive";
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
  const html = `<a href="${url.replace(/"/g,"&quot;")}" target="_blank" rel="noopener" class="link-chip chip-${plat}">${text.replace(/[<>]/g,"")}</a>`;
  document.execCommand("insertHTML", false, html);
}

// ===================== RICH EDITOR (WYSIWYG MIN) =====================
function initRichEditor(editorRoot){
  const editorArea = editorRoot.querySelector(".editor-area");
  const toolbar = editorRoot.querySelector(".rich-toolbar");
  function exec(cmd,v=null){ document.execCommand(cmd,false,v); editorArea.focus(); }
  toolbar.addEventListener("click",(e)=>{
    const btn = e.target.closest(".rtb-btn"); if(!btn) return;
    const { cmd, block, list } = btn.dataset;
    if(cmd) exec(cmd);
    if(block) exec("formatBlock", block);
    if(list==="ul") exec("insertUnorderedList");
    if(btn.classList.contains("rtb-link")){
      insertLinkChip(editorArea); // 👈 pide nombre, luego URL, colorea según plataforma
    }
  });
  const fontSel = toolbar.querySelector(".rtb-font");
  if(fontSel){ fontSel.addEventListener("change", ()=>{ const v=fontSel.value.trim(); if(v) exec("fontName", v); else editorArea.focus(); }); }
  return { getHTML: ()=>editorArea.innerHTML.trim(), setHTML: (h)=>{ editorArea.innerHTML = h||""; } };
}

// ===================== RENDER: CARDS/ROW =====================
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

    // ---- Trailer hover (URL o DataURL) — acepta previewVideo o preview_video
    const pv = g.previewVideo || g.preview_video || "";
    if (vid && pv) {
      const isPlayableURL  = /\.(mp4|webm)(\?.*)?$/i.test(pv);
      const isPlayableDATA = /^data:video\/(mp4|webm)/i.test(pv);
      if (!isPlayableURL && !isPlayableDATA) {
        console.warn("previewVideo no es .mp4/.webm directo ni dataURL:", pv);
      } else {
        let loaded = false;
        vid.poster = g.image;
        vid.muted = true;
        vid.loop = true;
        vid.playsInline = true;
        vid.setAttribute("muted","");
        vid.setAttribute("playsinline","");
        vid.preload = "metadata";

        const sourceEl = vid.querySelector("source");

        const ensureSrc = ()=>{ 
          if(loaded) return; 
          if(sourceEl){ sourceEl.src = pv; vid.load(); }
          else { vid.src = pv; }
          loaded = true; 
        };
        const start = ()=>{
          ensureSrc();
          vid.currentTime = 0;
          const p = vid.play(); if(p && p.catch) p.catch(()=>{});
        };
        const stop  = ()=>{ vid.pause(); vid.currentTime = 0; };
        const show  = ()=>vid.classList.add("playing");
        const hide  = ()=>vid.classList.remove("playing");
        vid.addEventListener("playing", show);
        vid.addEventListener("pause", hide);
        vid.addEventListener("ended", hide);
        vid.addEventListener("error", ()=>{ console.warn("Error trailer:", pv); vid.remove(); });
        tile.addEventListener("pointerenter", start);
        tile.addEventListener("pointerleave", stop);
        tile.addEventListener("focus", start);
        tile.addEventListener("blur", stop);
      }
    }

    tile.tabIndex = 0;
    tile.addEventListener("click", ()=>openGame(g));
    container.appendChild(node);
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

// ===================== RENDER: HERO =====================
function renderHeroCarousel(){
  const heroCarousel = document.querySelector(".hero-carousel");
  const heroArt = document.querySelector(".hero-art");
  if(!heroCarousel || !heroArt || !recientes.length) return;

  heroCarousel.innerHTML = "";
  const max = Math.min(5, recientes.length);
  for(let i=0;i<max;i++){
    const img = document.createElement("img");
    img.src = recientes[i].image;
    if(i===0) img.classList.add("active");
    heroCarousel.appendChild(img);
  }
  const setActive = (i)=>{
    const imgs = heroCarousel.querySelectorAll("img");
    imgs.forEach((im,idx)=>im.classList.toggle("active", idx===i));
    heroArt.style.backgroundImage = `url(${recientes[i]?.image||""})`;
  };
  setActive(0);
  const getActiveIndex = ()=> Array.from(heroCarousel.querySelectorAll("img")).findIndex(im=>im.classList.contains("active"));
  heroArt.addEventListener("click", ()=>{ const i=getActiveIndex(); openGame(recientes[i>=0?i:0]); });
  heroArt.addEventListener("keydown",(e)=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); const i=getActiveIndex(); openGame(recientes[i>=0?i:0]); }});
}

// ===================== MODAL: VER JUEGO =====================
function openGame(game){
  const modal = modalTemplate.content.cloneNode(true);
  const modalNode = modal.querySelector(".tw-modal");
  const modalImage = modal.querySelector(".tw-modal-image");
  const modalTitle = modal.querySelector(".tw-modal-title");
  const modalDescription = modal.querySelector(".tw-modal-description");
  const modalClose = modal.querySelector(".tw-modal-close");

  modalImage.src = game.image || "assets/images/construction/en-proceso.svg";
  modalTitle.textContent = game.title || "Sin título";
  modalDescription.innerHTML = game.description || "Sin descripción";

  const removeTrap = trapFocus(modalNode);
  const onEscape = (e)=>{ if(e.key==="Escape") closeModal(modalNode, removeTrap, onEscape); };
  modalClose.addEventListener("click", ()=> closeModal(modalNode, removeTrap, onEscape));
  openModalFragment(modalNode);
}

// ===================== CRUD POSTS =====================
function deleteGame(game, currentModalNode){
  if(!game.id){ alert("No se encontró ID."); return; }
  const token = localStorage.getItem("tgx_admin_token") || "";
  if(!token){ alert("Falta AUTH_TOKEN. Inicia sesión admin y pégalo."); return; }
  apiDelete(game.id, token)
    .then(()=>apiList())
    .then(data=>{
      recientes = Array.isArray(data)?data:[];
      renderRow(); renderHeroCarousel();
      if(currentModalNode) closeModal(currentModalNode);
      alert("Publicación eliminada.");
    })
    .catch(e=>{ console.error(e); alert("Error al borrar."); });
}

function openEditGame(original){
  const modal = newGameModalTemplate.content.cloneNode(true);
  const node = modal.querySelector(".tw-modal");
  const form = modal.querySelector(".new-game-form");
  const titleInput = modal.querySelector(".new-game-title");
  const descriptionInput = modal.querySelector(".new-game-description");
  const imageInput = modal.querySelector(".new-game-image-file");
  const trailerFileInput = modal.querySelector(".new-game-trailer-file");
  const trailerUrlInput = modal.querySelector(".new-game-trailer-url");
  const downloadInput = modal.querySelector(".new-game-download");
  const modalClose = modal.querySelector(".tw-modal-close");

  titleInput.value = original.title || "";
  if(descriptionInput) descriptionInput.value = (original.description||"").replace(/<[^>]+>/g,"");
  if(trailerUrlInput) trailerUrlInput.value = original.previewVideo || original.preview_video || "";
  if(downloadInput) downloadInput.value = original.downloadUrl || "";
  if(imageInput) imageInput.required = false;

  const removeTrap = trapFocus(node);
  const onEscape = (e)=>{ if(e.key==="Escape") closeModal(node, removeTrap, onEscape); };

  form.addEventListener("submit",(e)=>{
    e.preventDefault();
    alert("Edición desde UI aún no implementada. Por ahora elimina y vuelve a crear.");
  });

  modalClose.addEventListener("click",()=> closeModal(node, removeTrap, onEscape));
  openModalFragment(node);
}

function openNewGameModal(){
  const modal = newGameModalTemplate.content.cloneNode(true);
  const modalNode = modal.querySelector(".tw-modal");
  const form = modal.querySelector(".new-game-form");
  const titleInput = modal.querySelector(".new-game-title");
  const imageInput = modal.querySelector(".new-game-image-file"); // portada (file -> DataURL)
  const trailerFileInput = modal.querySelector(".new-game-trailer-file"); // ahora permitido
  const trailerUrlInput = modal.querySelector(".new-game-trailer-url");   // o URL directa
  const downloadInput = modal.querySelector(".new-game-download");
  const modalClose = modal.querySelector(".tw-modal-close");

  // WYSIWYG
  const editorRoot = modal.querySelector(".rich-editor");
  const editorAPI = initRichEditor(editorRoot);

  const removeTrap = trapFocus(modalNode);
  const onEscape = (e)=>{ if(e.key==="Escape") closeModal(modalNode, removeTrap, onEscape); };
  modalClose.addEventListener("click", ()=> closeModal(modalNode, removeTrap, onEscape));

  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const title = (titleInput.value||"").trim();
    const descHTML = editorAPI.getHTML();
    const imageFile = imageInput?.files?.[0];
    const rawTrailer = (trailerUrlInput?.value||"").trim();
    const trailerUrl = normalizeVideoUrl(rawTrailer);
    const trailerFile = trailerFileInput?.files?.[0] || null;
    const downloadUrl = (downloadInput?.value||"").trim() || null;

    if(!title){ alert("Título es obligatorio."); titleInput.focus(); return; }
    if(!imageFile){ alert("Selecciona una imagen de portada."); imageInput.focus(); return; }
    if(!descHTML || !descHTML.replace(/<[^>]*>/g,'').trim()){ alert("Escribe una descripción."); return; }

    // Validación trailer:
    let previewSrc = null;
    if (trailerUrl) {
      if (!/\.(mp4|webm)(\?.*)?$/i.test(trailerUrl)) {
        alert("El trailer por URL debe ser .mp4/.webm directo. YouTube/Imgur página no sirven.");
        return;
      }
      previewSrc = trailerUrl;
    } else if (trailerFile) {
      if (!/^video\/(mp4|webm)$/i.test(trailerFile.type)) { alert("El archivo de trailer debe ser MP4 o WEBM."); return; }
      if (trailerFile.size > 6 * 1024 * 1024) { alert("El trailer es muy pesado (>6MB). Usa URL o comprímelo."); return; }
      try { previewSrc = await readAsDataURL(trailerFile); } 
      catch { alert("No se pudo leer el trailer. Intenta con URL o archivo más pequeño."); return; }
    }

    let coverDataUrl = null;
    try { coverDataUrl = await readAsDataURL(imageFile); }
    catch { alert("No se pudo leer la portada."); return; }

    const token = localStorage.getItem("tgx_admin_token") || "";
    if(!token){ alert("Falta AUTH_TOKEN. Inicia sesión admin y pégalo."); return; }

    const newGame = {
      title,
      image: coverDataUrl,     // DataURL
      description: descHTML,
      previewVideo: previewSrc || null, // DataURL o URL
      downloadUrl,
      detailsUrl: "#"
    };

    try{
      await apiCreate(newGame, token);
      const data = await apiList();
      recientes = Array.isArray(data)?data:[];
      closeModal(modalNode, removeTrap, onEscape);
      renderRow(); renderHeroCarousel();
      alert("¡Juego añadido!");
    }catch(err){ console.error(err); alert("Error al guardar. Revisa consola."); }
  });

  openModalFragment(modalNode);
}

// ===================== SOCIALS (render + modal + borrar) =====================
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

// ===================== SEARCH / ARROWS / KEYBOARD =====================
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
  const prev = document.querySelector(".arrow.prev");
  const next = document.querySelector(".arrow.next");
  const row = document.querySelector(`.carousel[data-row="recientes"]`);
  if(!prev || !next || !row) return;
  prev.addEventListener("click", ()=> row.scrollBy({ left: -400, behavior: "smooth" }));
  next.addEventListener("click", ()=> row.scrollBy({ left: 400, behavior: "smooth" }));
}
function setupKeyboardNav(){
  const row = document.querySelector(`.carousel[data-row="recientes"]`);
  if(!row) return;
  row.addEventListener("keydown",(e)=>{
    if(e.key==="ArrowRight") row.scrollBy({ left: 200, behavior: "smooth" });
    if(e.key==="ArrowLeft")  row.scrollBy({ left: -200, behavior: "smooth" });
  });
}

// ===================== ADMIN LOGIN =====================
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
    if(!t){ t = prompt("Pega tu AUTH_TOKEN de Netlify para crear/borrar publicaciones/redes:"); if(t) localStorage.setItem(k, t.trim()); }
  }catch{}
}
function setupAdminButton(){
  const adminBtn = document.querySelector(".user-pill"); // botón topbar
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

// ===================== INIT =====================
async function initData(){
  try{ const data = await apiList(); recientes = Array.isArray(data)?data:[]; }
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
}
initData();
