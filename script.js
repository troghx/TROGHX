// ==== Templates ====
const template = document.getElementById("tile-template");
const modalTemplate = document.getElementById("game-modal-template");
const adminLoginModalTemplate = document.getElementById("admin-login-modal-template");
const newGameModalTemplate = document.getElementById("new-game-modal-template");
const newSocialModalTemplate = document.getElementById("new-social-modal-template");

// ==== LocalStorage Keys ====
const LS_RECENTES = "tgx_recientes";
const LS_ADMIN = "tgx_is_admin";
const LS_ADMIN_HASH = "tgx_admin_hash";
const LS_ADMIN_SALT = "tgx_admin_salt";
const LS_ADMIN_USER = "tgx_admin_user";
const LS_SOCIALS = "tgx_socials";

// ==== API (Netlify Functions + Neon) ====
const API = '/.netlify/functions/posts';

async function apiList() {
  const res = await fetch(API, { cache: 'no-store' });
  if (!res.ok) throw new Error('No se pudo listar');
  return res.json();
}

async function apiCreate(game, token) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || ''}`
    },
    body: JSON.stringify(game)
  });
  if (!res.ok) {
    const txt = await res.text().catch(()=> '');
    throw new Error('No se pudo crear: ' + txt);
  }
  return res.json();
}

async function apiDelete(id, token) {
  const res = await fetch(`${API}/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token || ''}` }
  });
  if (!res.ok) {
    const txt = await res.text().catch(()=> '');
    throw new Error('No se pudo borrar: ' + txt);
  }
  return res.json();
}

let isAdmin = false;
let recientes = [];
let socials = [];

rehydrate();

// ==== Storage helpers ====
function rehydrate() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_RECENTES) || "[]");
    if (Array.isArray(saved)) recientes = saved;
  } catch {}
  try {
    const savedS = JSON.parse(localStorage.getItem(LS_SOCIALS) || "[]");
    if (Array.isArray(savedS)) socials = savedS;
  } catch {}
  isAdmin = localStorage.getItem(LS_ADMIN) === "1";
}
function persistRecientes() {
  try { localStorage.setItem(LS_RECENTES, JSON.stringify(recientes)); } catch {}
}
function persistAdmin(flag) {
  try { localStorage.setItem(LS_ADMIN, flag ? "1" : "0"); } catch {}
}
function persistSocials() {
  try { localStorage.setItem(LS_SOCIALS, JSON.stringify(socials)); } catch {}
}

// ==== Preload helper ====
function preload(src) {
  const img = new Image();
  img.src = src;
}

// ==== Rich Editor (minimal WYSIWYG) ====
function initRichEditor(editorRoot) {
  const editorArea = editorRoot.querySelector(".editor-area");
  const toolbar = editorRoot.querySelector(".rich-toolbar");

  function exec(cmd, value = null) {
    document.execCommand(cmd, false, value);
    editorArea.focus();
  }

  toolbar.addEventListener("click", (e) => {
    const btn = e.target.closest(".rtb-btn");
    if (!btn) return;
    const cmd = btn.dataset.cmd;
    const block = btn.dataset.block;
    const list = btn.dataset.list;

    if (cmd) exec(cmd);
    if (block) exec("formatBlock", block);
    if (list === "ul") exec("insertUnorderedList");

    if (btn.classList.contains("rtb-link")) {
      const url = prompt("URL del enlace:");
      if (url) {
        exec("createLink", url);
      }
    }
  });

  // Cambio de fuente
  const fontSel = toolbar.querySelector(".rtb-font");
  if (fontSel) {
    fontSel.addEventListener("change", () => {
      const val = fontSel.value.trim();
      if (val) exec("fontName", val);
      else editorArea.focus();
    });
  }

  return {
    getHTML: () => editorArea.innerHTML.trim(),
    setHTML: (html) => { editorArea.innerHTML = html || ""; }
  };
}

// ==== Modal helpers ====
function openModalFragment(fragment) {
  document.body.appendChild(fragment);
  setTimeout(() => fragment.classList.add("show"), 0);
}
function closeModal(modalNode, removeTrap, onEscape) {
  modalNode.classList.remove("show");
  document.body.style.overflow = "";
  if (removeTrap) removeTrap();
  if (onEscape) modalNode.removeEventListener("keydown", onEscape);
  setTimeout(() => { try { modalNode.remove(); } catch {} }, 300);
}

function findGameRef(game) {
  const idx = recientes.findIndex(g => g.title === game.title && g.image === game.image);
  return idx !== -1 ? { row: "recientes", index: idx } : null;
}
function trapFocus(modalNode) {
  const selectors = [
    "a[href]", "button:not([disabled])", "textarea:not([disabled])",
    "input:not([disabled])", "select:not([disabled])", "[tabindex]:not([tabindex='-1'])"
  ];
  const getList = () => Array.from(modalNode.querySelectorAll(selectors.join(",")));
  function onKey(e) {
    if (e.key !== "Tab") return;
    const items = getList();
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  modalNode.addEventListener("keydown", onKey);
  return () => modalNode.removeEventListener("keydown", onKey);
}

// ==== Plataformas (enlace enriquecido simple) ====
function detectPlatform(url) {
  try {
    const u = new URL(url);
    const h = u.hostname.toLowerCase();
    if (h.includes("drive.google")) return { key: "drive", color: "#1a73e8" };
    if (h.includes("mega")) return { key: "mega", color: "#d9272e" };
    if (h.includes("mediafire")) return { key: "mediafire", color: "#1da1f2" };
    if (h.includes("torrent") || h.includes("utorrent") || h.includes("bittorrent")) return { key: "torrent", color: "#2ecc71" };
    return { key: "link", color: "#00ffff" };
  } catch {
    return { key: "link", color: "#00ffff" };
  }
}

function insertPlatformLink(area, displayText, url) {
  const { key } = detectPlatform(url);
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener";
  a.textContent = displayText || url;
  a.className = `rich-link platform-${key}`;

  const sel = window.getSelection();
  if (!sel.rangeCount) {
    area.appendChild(a);
  } else {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(a);
  }
}

// ==== Render: fila de recientes ====
function renderRow() {
  const container = document.querySelector(`.carousel[data-row="recientes"]`);
  if (!container) return;
  container.innerHTML = "";

  recientes.forEach((g) => {
    const node = template.content.cloneNode(true);
    const tile = node.querySelector(".tile");
    const cover = node.querySelector(".cover");
    const title = node.querySelector(".title");
    const vid = node.querySelector(".tile-video");

    cover.style.backgroundImage = `url(${g.image})`;
    preload(g.image);

    if (vid && g.previewVideo) {
      let loaded = false;
      const ensureSrc = () => {
        if (loaded) return;
        vid.src = g.previewVideo;
        loaded = true;
      };
      const start = () => {
        ensureSrc();
        vid.currentTime = 0;
        const p = vid.play(); if (p && p.catch) p.catch(() => {});
      };
      const stop = () => { vid.pause(); vid.currentTime = 0; };
      const show = () => vid.classList.add("playing");
      const hide = () => vid.classList.remove("playing");
      vid.addEventListener("playing", show);
      vid.addEventListener("pause", hide);
      vid.addEventListener("ended", hide);
      vid.addEventListener("error", () => { vid.remove(); });
      tile.addEventListener("pointerenter", start);
      tile.addEventListener("pointerleave", stop);
      tile.addEventListener("focus", start);
      tile.addEventListener("blur", stop);
    }

    title.textContent = g.title;
    tile.tabIndex = 0;
    tile.addEventListener("click", () => openGame(g));
    container.appendChild(node);
  });

  if (isAdmin) {
    const addTile = document.createElement("div");
    addTile.className = "add-game-tile";
    addTile.tabIndex = 0;
    addTile.innerHTML = "<span>+ Añadir juego</span>";
    addTile.addEventListener("click", openNewGameModal);
    container.insertBefore(addTile, container.firstChild);
  }
}

// ==== Render: Hero Carousel ====
function renderHeroCarousel() {
  const heroCarousel = document.querySelector(".hero-carousel");
  const heroTitle = document.querySelector(".hero-title");
  const heroArt = document.querySelector(".hero-art");
  const bullets = document.querySelector(".bullets");
  if (!heroCarousel || !heroTitle || !heroArt || !bullets) return;

  heroCarousel.innerHTML = "";
  bullets.innerHTML = "";

  const max = Math.min(5, recientes.length);
  for (let i = 0; i < max; i++) {
    const img = document.createElement("img");
    img.src = recientes[i].image;
    heroCarousel.appendChild(img);

    const b = document.createElement("button");
    b.className = i === 0 ? "active" : "";
    b.setAttribute("aria-label", `Slide ${i + 1}`);
    b.addEventListener("click", () => setActive(i));
    bullets.appendChild(b);
  }
  const setActive = (i) => {
    const imgs = heroCarousel.querySelectorAll("img");
    imgs.forEach((im, idx) => im.classList.toggle("active", idx === i));
    const bs = bullets.querySelectorAll("button");
    bs.forEach((bt, idx) => bt.classList.toggle("active", idx === i));
    heroTitle.textContent = recientes[i]?.title || "";
    heroArt.style.backgroundImage = `url(${recientes[i]?.image || ""})`;
  };
  setActive(0);

  const getActiveIndex = () => {
    const bs = bullets.querySelectorAll("button");
    return Array.from(bs).findIndex((g) => g.classList.contains("active"));
  };

  heroArt.addEventListener("click", () => {
    const i = getActiveIndex();
    openGame(recientes[i >= 0 ? i : 0]);
  });
  heroArt.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const i = getActiveIndex();
      openGame(recientes[i >= 0 ? i : 0]);
    }
  });

  function tick() {
    const images = heroCarousel.querySelectorAll("img");
    if (!images.length) return;
    const activeIndex = Array.from(images).findIndex((im) => im.classList.contains("active"));
    const next = (activeIndex + 1) % images.length;
    setActive(next);
  }
  // Auto-slide
  // setInterval(tick, 8000);
}

// ==== Modal: Ver juego ====
function openGame(game) {
  const modal = modalTemplate.content.cloneNode(true);
  const modalNode = modal.querySelector(".tw-modal");
  const modalContent = modal.querySelector(".tw-modal-content");
  const modalImage = modal.querySelector(".tw-modal-image");
  const modalTitle = modal.querySelector(".tw-modal-title");
  const modalDescription = modal.querySelector(".tw-modal-description");
  const modalDownload = modal.querySelector(".tw-modal-download");
  const modalSecondary = modal.querySelector(".tw-modal-secondary");
  const modalClose = modal.querySelector(".tw-modal-close");

  modalImage.src = game.image || "assets/images/construction/en-proceso.svg";
  modalTitle.textContent = game.title || "Sin título";
  // Render WYSIWYG (HTML)
  modalDescription.innerHTML = game.description || "Sin descripción";
  modalDownload.addEventListener("click", () => { if (game.downloadUrl) window.location.href = game.downloadUrl; });
  modalSecondary.addEventListener("click", () => { alert("Pronto: detalles extendidos"); });

  // Admin kebab
  if (isAdmin) {
    const kebabBtn = document.createElement("button");
    kebabBtn.className = "kebab-menu";
    kebabBtn.innerHTML = "⋮";
    const panel = document.createElement("div");
    panel.className = "kebab-panel";
    panel.innerHTML = `
      <button data-action="edit">Editar</button>
      <button data-action="delete">Eliminar</button>
    `;
    kebabBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      panel.classList.toggle("show");
    });
    document.addEventListener("click", (e) => {
      if (!panel.contains(e.target) && e.target !== kebabBtn) panel.classList.remove("show");
    });

    panel.addEventListener("click", (e) => {
      const action = e.target?.dataset?.action;
      if (action === "edit") {
        panel.classList.remove("show");
        openEditGame(game, modalNode, { onUpdated: (updated) => {
          modalTitle.textContent = updated.title;
          modalDescription.innerHTML = updated.description;
          if (updated.image) modalImage.src = updated.image;
        }});
      }
      if (action === "delete") {
        panel.classList.remove("show");
        if (confirm("¿Eliminar esta publicación? Esta acción no se puede deshacer.")) {
          deleteGame(game, modalNode);
        }
      }
    });

    modalContent.appendChild(kebabBtn);
    modalContent.appendChild(panel);
  }

  const removeTrap = trapFocus(modalNode);
  const onEscape = (e) => { if (e.key === "Escape") closeModal(modalNode, removeTrap, onEscape); };
  modalClose.addEventListener("click", () => closeModal(modalNode, removeTrap, onEscape));
  openModalFragment(modalNode);
}

// ==== CRUD de publicaciones ====
function deleteGame(game, currentModalNode) {
  if (!game.id) { alert("No se encontró el ID de la publicación."); return; }
  const token = localStorage.getItem('tgx_admin_token') || '';
  if (!token) { alert("Falta AUTH_TOKEN. Inicia sesión de admin y pega el token cuando se te pida."); return; }
  apiDelete(game.id, token)
    .then(() => apiList())
    .then(data => {
      recientes = Array.isArray(data) ? data : [];
      renderRow();
      renderHeroCarousel();
      if (currentModalNode) closeModal(currentModalNode);
      alert("Publicación eliminada.");
    })
    .catch(err => {
      console.error(err);
      alert("Error al borrar. Revisa la consola.");
    });
}

function openEditGame(original, currentModalNode, opts = {}) {
  const modal = newGameModalTemplate.content.cloneNode(true);
  const node = modal.querySelector(".tw-modal");
  const form = modal.querySelector(".new-game-form");
  const titleInput = modal.querySelector(".new-game-title");
  // Para edición simple, mantenemos textarea/descripción si existiera; si quieres, después migramos también a WYSIWYG aquí.
  const descriptionInput = modal.querySelector(".new-game-description");
  const imageInput = modal.querySelector(".new-game-image-file");
  const trailerFileInput = modal.querySelector(".new-game-trailer-file");
  const trailerUrlInput = modal.querySelector(".new-game-trailer-url");
  const downloadInput = modal.querySelector(".new-game-download");
  const modalClose = modal.querySelector(".tw-modal-close");

  titleInput.value = original.title || "";
  if (descriptionInput) { descriptionInput.value = (original.description || "").replace(/<[^>]+>/g, ""); }
  if (trailerUrlInput) trailerUrlInput.value = original.previewVideo || "";
  if (downloadInput) downloadInput.value = original.downloadUrl || "";
  if (imageInput) imageInput.required = false;

  const removeTrap = trapFocus(node);
  const onEscape = (e) => { if (e.key === "Escape") closeModal(node, removeTrap, onEscape); };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    alert("Edición desde UI aún no implementada con API. De momento, elimina y vuelve a crear.");
  });
  modalClose.addEventListener("click", () => closeModal(node, removeTrap, onEscape));
  openModalFragment(node);
}

// ==== Nuevo juego (API) ====
function openNewGameModal() {
  const modal = newGameModalTemplate.content.cloneNode(true);
  const modalNode = modal.querySelector(".tw-modal");
  const form = modal.querySelector(".new-game-form");
  const titleInput = modal.querySelector(".new-game-title");
  const imageInput = modal.querySelector(".new-game-image-file");
  const trailerFileInput = modal.querySelector(".new-game-trailer-file");
  const trailerUrlInput = modal.querySelector(".new-game-trailer-url");
  const downloadInput = modal.querySelector(".new-game-download");
  const modalClose = modal.querySelector(".tw-modal-close");

  // WYSIWYG
  const editorRoot = modal.querySelector(".rich-editor");
  const editorAPI = initRichEditor(editorRoot);

  const removeTrap = trapFocus(modalNode);
  const onEscape = (e) => { if (e.key === "Escape") closeModal(modalNode, removeTrap, onEscape); };
  modalClose.addEventListener("click", () => closeModal(modalNode, removeTrap, onEscape));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = (titleInput.value || "").trim();
    const descHTML = editorAPI.getHTML();
    const imageFile = imageInput?.files?.[0];
    const trailerUrl = (trailerUrlInput?.value || "").trim();
    const downloadUrl = (downloadInput?.value || "").trim() || null;

    if (!title) { alert("Título es obligatorio."); titleInput.focus(); return; }
    if (!imageFile) { alert("Selecciona una imagen de portada."); imageInput.focus(); return; }
    if (!descHTML || !descHTML.replace(/<[^>]*>/g, '').trim()) {
      alert("Escribe una descripción."); return;
    }

    if (!trailerUrl && trailerFileInput?.files?.[0]) {
      alert("Por ahora usa una URL pública para el trailer (.mp4). Ignorando el archivo local.");
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const token = localStorage.getItem('tgx_admin_token') || '';
      if (!token) { alert("Falta AUTH_TOKEN. Inicia sesión de admin y pega el token cuando se te pida."); return; }
      const newGame = {
        title,
        image: reader.result,           // DataURL (temporal). Recomendado migrar a URL pública.
        description: descHTML,          // HTML enriquecido
        previewVideo: trailerUrl || null,
        downloadUrl,
        detailsUrl: "#"
      };
      try {
        await apiCreate(newGame, token);
        const data = await apiList();
        recientes = Array.isArray(data) ? data : [];
        closeModal(modalNode, removeTrap, onEscape);
        renderRow();
        renderHeroCarousel();
        alert("¡Juego añadido exitosamente!");
      } catch (err) {
        console.error(err);
        alert("Error al guardar. Revisa la consola.");
      }
    };
    reader.onerror = () => alert("No se pudo leer la imagen.");
    reader.readAsDataURL(imageFile);
  });

  document.body.appendChild(modalNode);
  setTimeout(() => modalNode.classList.add("show"), 0);
}

// ==== Socials ====
function openNewSocialModal() {
  const modal = newSocialModalTemplate.content.cloneNode(true);
  const modalNode = modal.querySelector(".tw-modal");
  const form = modal.querySelector(".new-social-form");
  const imageInput = modal.querySelector(".new-social-image");
  const urlInput = modal.querySelector(".new-social-url");
  const modalClose = modal.querySelector(".tw-modal-close");

  const removeTrap = trapFocus(modalNode);
  const onEscape = (e) => { if (e.key === "Escape") closeModal(modalNode, removeTrap, onEscape); };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const file = imageInput?.files?.[0];
    if (!file) { alert("Selecciona una imagen."); return; }
    const url = (urlInput.value || "").trim();
    if (!url) { alert("Coloca el enlace de la red."); urlInput.focus(); return; }

    const reader = new FileReader();
    reader.onload = () => {
      socials.push({ image: reader.result, url });
      persistSocials();
      renderSocialBar();
      closeModal(modalNode, removeTrap, onEscape);
    };
    reader.readAsDataURL(file);
  });
  modalClose.addEventListener("click", () => closeModal(modalNode, removeTrap, onEscape));
  openModalFragment(modalNode);
}

function renderSocialBar() {
  const bar = document.querySelector(".social-bar");
  if (!bar) return;
  bar.innerHTML = "";

  socials.forEach((s) => {
    const a = document.createElement("a");
    a.href = s.url;
    a.target = "_blank";
    a.rel = "noopener";
    const img = document.createElement("img");
    img.src = s.image;
    a.appendChild(img);
    bar.appendChild(a);
  });

  if (isAdmin) {
    const btn = document.createElement("button");
    btn.className = "add-social-btn";
    btn.textContent = "+";
    btn.addEventListener("click", openNewSocialModal);
    bar.appendChild(btn);
  }
}

// ==== Búsqueda ====
function setupSearch() {
  const input = document.querySelector(".search-input");
  if (!input) return;
  input.addEventListener("input", () => {
    const q = input.value.toLowerCase();
    const filtered = recientes.filter((g) =>
      (g.title || "").toLowerCase().includes(q) ||
      (g.description || "").toLowerCase().includes(q)
    );
    const container = document.querySelector(`.carousel[data-row="recientes"]`);
    if (!container) return;
    container.innerHTML = "";

    filtered.forEach((g) => {
      const node = template.content.cloneNode(true);
      const tile = node.querySelector(".tile");
      const cover = node.querySelector(".cover");
      const title = node.querySelector(".title");
      cover.style.backgroundImage = `url(${g.image})`;
      title.textContent = g.title;
      tile.addEventListener("click", () => openGame(g));
      container.appendChild(node);
    });
  });
}

// ==== Flechas / teclado ====
function setupArrows() {
  const left = document.querySelector(".arrow-left");
  const right = document.querySelector(".arrow-right");
  const row = document.querySelector(`.carousel[data-row="recientes"]`);
  if (!left || !right || !row) return;

  left.addEventListener("click", () => row.scrollBy({ left: -400, behavior: "smooth" }));
  right.addEventListener("click", () => row.scrollBy({ left: 400, behavior: "smooth" }));
}
function setupKeyboardNav() {
  const row = document.querySelector(`.carousel[data-row="recientes"]`);
  if (!row) return;
  row.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") row.scrollBy({ left: 200, behavior: "smooth" });
    if (e.key === "ArrowLeft") row.scrollBy({ left: -200, behavior: "smooth" });
  });
}

// ==== Admin Login ====
function toHex(buf) {
  const v = new Uint8Array(buf);
  return Array.from(v).map(b => b.toString(16).padStart(2, "0")).join("");
}
async function sha256(str) {
  const enc = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return toHex(digest);
}
function genSaltHex(len = 16) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}
async function hashCreds(user, pin, saltHex) {
  return sha256(`${user}::${pin}::${saltHex}`);
}

function openAdminLoginModal() {
  const modal = adminLoginModalTemplate.content.cloneNode(true);
  const modalNode = modal.querySelector(".tw-modal");
  const form = modal.querySelector(".admin-login-form");
  const h2 = modal.querySelector("h2");
  const usernameInput = modal.querySelector(".admin-username");
  const pinInput = modal.querySelector(".admin-pin");
  const submitBtn = form.querySelector('button[type="submit"]');
  const modalClose = modal.querySelector(".tw-modal-close");

  const savedHash = localStorage.getItem(LS_ADMIN_HASH);
  const savedSalt = localStorage.getItem(LS_ADMIN_SALT);
  const savedUser = localStorage.getItem(LS_ADMIN_USER);
  const isFirstRun = !(savedHash && savedSalt && savedUser);

  if (isFirstRun) {
    h2.textContent = "Configurar administrador";
    submitBtn.textContent = "Crear y entrar";
    const confirmLabel = document.createElement("label");
    confirmLabel.innerHTML = `
      Confirmar PIN
      <input type="password" class="admin-pin2" required>
      <span class="input-hint">Repite el PIN (4 a 6 dígitos).</span>
    `;
    form.insertBefore(confirmLabel, form.querySelector(".tw-modal-actions"));
  }

  const removeTrap = trapFocus(modalNode);
  const onEscape = (e) => { if (e.key === "Escape") closeModal(modalNode, removeTrap, onEscape); };
  modalClose.addEventListener("click", () => closeModal(modalNode, removeTrap, onEscape));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = (usernameInput.value || "").trim();
    const pin = (pinInput.value || "").trim();
    if (!user || !pin) { alert("Completa usuario y PIN."); return; }
    if (!/^[0-9]{4,6}$/.test(pin)) { alert("PIN debe ser 4 a 6 dígitos."); return; }

    if (isFirstRun) {
      const pin2 = modalNode.querySelector(".admin-pin2")?.value?.trim();
      if (pin !== pin2) { alert("Los PIN no coinciden."); return; }
      const salt = genSaltHex(16);
      const hash = await hashCreds(user, pin, salt);
      try {
        localStorage.setItem(LS_ADMIN_HASH, hash);
        localStorage.setItem(LS_ADMIN_SALT, salt);
        localStorage.setItem(LS_ADMIN_USER, user);
      } catch {}
      isAdmin = true;
      persistAdmin(true);
      closeModal(modalNode, removeTrap, onEscape);
      renderRow();
      renderHeroCarousel();
      renderSocialBar();
      setupAdminButton();
      ensureAuthTokenPrompt();
      alert("Administrador configurado e iniciado.");
    } else {
      if (user !== savedUser) { alert("Usuario o PIN incorrectos."); return; }
      const hash = await hashCreds(user, pin, savedSalt);
      if (hash === savedHash) {
        isAdmin = true;
        persistAdmin(true);
        closeModal(modalNode, removeTrap, onEscape);
        renderRow();
        renderHeroCarousel();
        renderSocialBar();
        setupAdminButton();
        ensureAuthTokenPrompt();
        alert("¡Sesión iniciada como admin!");
      } else {
        alert("Usuario o PIN incorrectos.");
      }
    }
  });

  openModalFragment(modalNode);
}

function ensureAuthTokenPrompt() {
  try {
    const k = 'tgx_admin_token';
    let t = localStorage.getItem(k);
    if (!t) {
      t = prompt('Pega tu AUTH_TOKEN de Netlify para poder crear/borrar publicaciones:');
      if (t) localStorage.setItem(k, t.trim());
    }
  } catch {}
}

// ==== Botón Admin ====
function setupAdminButton() {
  const adminBtn = document.querySelector(".admin-btn");
  if (!adminBtn) return;

  adminBtn.textContent = isAdmin ? "Salir (admin)" : "Admin";
  adminBtn.title = isAdmin ? "Cerrar sesión de administrador" : "Iniciar sesión de administrador";

  adminBtn.addEventListener("click", () => {
    if (isAdmin) {
      if (confirm("¿Cerrar sesión de administrador?")) {
        isAdmin = false;
        persistAdmin(false);
        renderRow();
        renderHeroCarousel();
        renderSocialBar();
        setupAdminButton();
        alert("Sesión cerrada.");
      }
    } else {
      openAdminLoginModal();
    }
  });
}

// ==== Init ====
async function initData() {
  try {
    const data = await apiList();
    recientes = Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('[initData]', e);
    recientes = [];
  }
  renderRow();
  setupArrows();
  setupSearch();
  setupKeyboardNav();
  setupAdminButton();
  renderHeroCarousel();
  renderSocialBar();
}
initData();
