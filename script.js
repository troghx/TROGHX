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

// ==== Crypto helpers (SHA-256 + salt) ====
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
async function hashCreds(user, pin, salt) {
  return sha256(`${user}:${pin}:${salt}`);
}

// ==== Utils ====
function preload(src) { if (src) { const i = new Image(); i.src = src; } }
function safeFocus(el) { try { el && el.focus && el.focus(); } catch {} }
function findGameRef(game) {
  const idx = recientes.findIndex(g => g.title === game.title && g.image === g.image);
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

// ==== Rich Editor helpers ====
const PLATFORM_MAP = [
  { key: "youtube", test: (h,u) => /(^|\.)youtube\.com$/.test(h) || /youtu\.be$/.test(h), color: "#FF0000" },
  { key: "utorrent", test: (h,u) => u.startsWith("magnet:") || /utorrent|bittorrent/.test(h), color: "#2AB24C" },
  { key: "mega", test: (h) => /(^|\.)mega\.nz$/.test(h), color: "#D9272E" },
  { key: "mediafire", test: (h) => /(^|\.)mediafire\.com$/.test(h), color: "#1292EE" },
  { key: "drive", test: (h) => /(^|\.)drive\.google\.com$/.test(h), color: "#0F9D58" },
  { key: "dropbox", test: (h) => /(^|\.)dropbox\.com$/.test(h), color: "#0061FF" },
  { key: "onedrive", test: (h) => /(^|\.)1drv\.ms$/.test(h) || /(^|\.)onedrive\.live\.com$/.test(h), color: "#0078D4" },
  { key: "vimeo", test: (h) => /(^|\.)vimeo\.com$/.test(h), color: "#1AB7EA" },
  { key: "tiktok", test: (h) => /(^|\.)tiktok\.com$/.test(h), color: "#25F4EE" },
  { key: "twitch", test: (h) => /(^|\.)twitch\.tv$/.test(h), color: "#9146FF" },
  { key: "steam", test: (h) => /(^|\.)steampowered\.com$/.test(h) || /(^|\.)store\.steampowered\.com$/.test(h), color: "#66C0F4" },
];

function detectPlatform(url) {
  try {
    if (url.startsWith("magnet:")) return { key: "utorrent", color: "#2AB24C" };
    const { hostname } = new URL(url);
    const h = hostname.replace(/^www\./, "").toLowerCase();
    const hit = PLATFORM_MAP.find(p => p.test(h, url));
    return hit || { key: "link", color: "#00ffff" };
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
  if (!sel || sel.rangeCount === 0) {
    area.appendChild(a);
    area.appendChild(document.createTextNode(" "));
    return;
  }
  const range = sel.getRangeAt(0);
  if (!area.contains(range.commonAncestorContainer)) {
    area.appendChild(a);
    area.appendChild(document.createTextNode(" "));
    return;
  }
  range.deleteContents();
  range.insertNode(a);
  range.collapse(false);
}

function applyFontFamily(family) {
  // execCommand('fontName') sigue soportado en la mayoría de navegadores de escritorio
  if (family) document.execCommand("fontName", false, family);
}

function formatBlock(tag) {
  document.execCommand("formatBlock", false, tag.toUpperCase());
}

function toggleList(type) {
  if (type === "ul") document.execCommand("insertUnorderedList");
}

function initRichEditor(root) {
  const area = root.querySelector(".editor-area");
  const toolbar = root.querySelector(".rich-toolbar");
  const fontSel = root.querySelector(".rtb-font");
  // Acciones básicas
  toolbar.addEventListener("click", (e) => {
    const btn = e.target.closest(".rtb-btn");
    if (!btn) return;
    if (btn.dataset.cmd) document.execCommand(btn.dataset.cmd);
    if (btn.dataset.block) formatBlock(btn.dataset.block);
    if (btn.dataset.list) toggleList(btn.dataset.list);
    if (btn.classList.contains("rtb-link")) {
      const text = prompt("Texto a mostrar:");
      const url = prompt("URL del enlace:");
      if (url) insertPlatformLink(area, text || url, url);
    }
  });
  if (fontSel) {
    fontSel.addEventListener("change", () => applyFontFamily(fontSel.value));
  }
  // Valor API
  return {
    getHTML() { return (area.innerHTML || "").trim(); },
    setHTML(html) { area.innerHTML = html || ""; }
  };
}

// ==== Render de fila "recientes" ====
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
      vid.poster = g.image;
      let loaded = false;
      const ensureSrc = () => {
        if (!loaded) { vid.src = g.previewVideo; loaded = true; }
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

// ==== Hero carousel ====
function renderHeroCarousel() {
  const heroCarousel = document.querySelector(".hero-carousel");
  const heroArt = document.querySelector(".hero-art");
  if (!heroCarousel) return;

  heroCarousel.innerHTML = "";
  recientes.slice(0, 3).forEach((g, index) => {
    const img = document.createElement("img");
    img.src = g.image;
    img.alt = `Portada de ${g.title}`;
    if (index === 0) img.classList.add("active");
    heroCarousel.appendChild(img);
    preload(g.image);
  });

  const getActiveIndex = () => {
    const images = heroCarousel.querySelectorAll("img");
    return Array.from(images).findIndex(img => img.classList.contains("active"));
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
    let current = getActiveIndex();
    if (current < 0) current = 0;
    images[current].classList.remove("active");
    const next = (current + 1) % images.length;
    images[next].classList.add("active");
  }

  const start = () => { stop(); heroTimer = setInterval(tick, 5000); };
  const stop = () => { if (heroTimer) { clearInterval(heroTimer); heroTimer = null; } };
  let heroTimer = null;

  heroArt.addEventListener("mouseenter", stop);
  heroArt.addEventListener("mouseleave", start);
  start();
}

// ==== Modales: juego ====
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
  modalSecondary.addEventListener("click", () => { if (game.detailsUrl) window.location.href = game.detailsUrl; });

  if (isAdmin) {
    const kebabBtn = document.createElement("button");
    kebabBtn.className = "tw-modal-menu";
    kebabBtn.setAttribute("aria-label", "Opciones de publicación");
    kebabBtn.textContent = "⋮";

    const panel = document.createElement("div");
    panel.className = "tw-kebab-panel";
    panel.innerHTML = `
      <button class="tw-kebab-item" data-action="edit">Editar publicación</button>
      <button class="tw-kebab-item danger" data-action="delete">Eliminar publicación</button>
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
  modalNode.addEventListener("keydown", onEscape);

  modalClose.addEventListener("click", () => closeModal(modalNode, removeTrap, onEscape));
  modalNode.addEventListener("click", (e) => { if (e.target === modalNode) closeModal(modalNode, removeTrap, onEscape); });

  document.body.appendChild(modal);
  document.body.classList.add("modal-open");
  document.body.style.overflow = "hidden";
  setTimeout(() => {
    modalNode.classList.add("active");
    safeFocus(modalClose);
  }, 10);
}

function closeModal(modalNode, removeTrap, onEscape) {
  if (!modalNode) return;
  modalNode.classList.remove("active");
  document.body.classList.remove("modal-open");
  document.body.style.overflow = "";
  if (removeTrap) removeTrap();
  if (onEscape) modalNode.removeEventListener("keydown", onEscape);
  setTimeout(() => { try { modalNode.remove(); } catch {} }, 300);
}

// ==== CRUD de publicaciones ====
function deleteGame(game, currentModalNode) {
  const ref = findGameRef(game);
  if (!ref) { alert("No se encontró la publicación."); return; }
  recientes.splice(ref.index, 1);
  persistRecientes();
  renderRow();
  renderHeroCarousel();
  if (currentModalNode) closeModal(currentModalNode);
  alert("Publicación eliminada.");
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
    const ref = findGameRef(original);
    if (!ref) { alert("No se encontró la publicación."); return; }
    const current = recientes[ref.index];

    const applyUpdate = (imgBase64) => {
      const updated = {
        ...current,
        title: titleInput.value.trim() || current.title,
        // Si se usa el textarea de edición, guardamos texto plano; (opcional: migramos WYSIWYG en otro paso)
        description: descriptionInput ? (descriptionInput.value.trim() || current.description) : current.description,
        image: imgBase64 || current.image,
        previewVideo: trailerUrlInput?.value?.trim() || current.previewVideo,
        downloadUrl: downloadInput?.value?.trim() || current.downloadUrl,
        detailsUrl: current.detailsUrl
      };
      recientes[ref.index] = updated;
      persistRecientes();
      renderRow();
      renderHeroCarousel();
      closeModal(node, removeTrap, onEscape);
      if (typeof opts.onUpdated === "function") opts.onUpdated(updated);
      alert("Publicación actualizada.");
    };

    const file = imageInput?.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => applyUpdate(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      applyUpdate(null);
    }
  });

  node.addEventListener("keydown", onEscape);
  modalClose.addEventListener("click", () => closeModal(node, removeTrap, onEscape));
  node.addEventListener("click", (e) => { if (e.target === node) closeModal(node, removeTrap, onEscape); });

  document.body.appendChild(modal);
  document.body.classList.add("modal-open");
  document.body.style.overflow = "hidden";
  setTimeout(() => { node.classList.add("active"); safeFocus(titleInput); }, 10);
}

// ==== Modal: NUEVA publicación (con WYSIWYG) ====
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

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const file = imageInput?.files?.[0];
    const descHTML = editorAPI.getHTML();
    if (!descHTML) { alert("Por favor escribe una descripción."); return; }
    if (!file) { alert("Por favor selecciona una imagen."); return; }

    const reader = new FileReader();
    reader.onload = function (ev) {
      let trailer = (trailerUrlInput?.value || "").trim();
      const trailerFile = trailerFileInput?.files?.[0] || null;
      if (!trailer && trailerFile) { try { trailer = URL.createObjectURL(trailerFile); } catch {} }
      const newGame = {
        title: titleInput.value.trim() || "Sin título",
        image: ev.target.result,
        description: descHTML, // HTML enriquecido
        downloadUrl: (downloadInput?.value || "#").trim(),
        detailsUrl: "#",
        previewVideo: trailer || ""
      };
      recientes.unshift(newGame);
      persistRecientes();
      closeModal(modalNode, removeTrap, onEscape);
      renderRow();
      renderHeroCarousel();
      alert("¡Juego añadido exitosamente!");
    };
    reader.readAsDataURL(file);
  });

  modalNode.addEventListener("keydown", onEscape);
  modalClose.addEventListener("click", () => closeModal(modalNode, removeTrap, onEscape));
  modalNode.addEventListener("click", (e) => { if (e.target === modalNode) closeModal(modalNode, removeTrap, onEscape); });

  document.body.appendChild(modal);
  document.body.classList.add("modal-open");
  document.body.style.overflow = "hidden";
  setTimeout(() => { modalNode.classList.add("active"); safeFocus(titleInput); }, 10);
}

// ==== Login Admin ====
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
    pinInput.parentElement.after(confirmLabel);
  } else {
    h2.textContent = "Acceso administrador";
    submitBtn.textContent = "Entrar";
    if (usernameInput) usernameInput.value = savedUser || "";
  }

  const removeTrap = trapFocus(modalNode);
  const onEscape = (e) => { if (e.key === "Escape") closeModal(modalNode, removeTrap, onEscape); };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = (usernameInput.value || "").trim();
    const pin = (pinInput.value || "").trim();
    if (!/^\d{4,6}$/.test(pin)) { alert("El PIN debe ser numérico de 4 a 6 dígitos."); pinInput.focus(); return; }
    if (!user) { alert("Escribe un usuario."); usernameInput.focus(); return; }

    if (isFirstRun) {
      const pin2 = modalNode.querySelector(".admin-pin2")?.value?.trim() || "";
      if (pin !== pin2) { alert("El PIN no coincide."); return; }
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
        alert("¡Sesión iniciada como admin!");
      } else {
        alert("Usuario o PIN incorrectos.");
      }
    }
  });

  modalNode.addEventListener("keydown", onEscape);
  modalClose.addEventListener("click", () => closeModal(modalNode, removeTrap, onEscape));
  modalNode.addEventListener("click", (e) => { if (e.target === modalNode) closeModal(modalNode, removeTrap, onEscape); });

  document.body.appendChild(modal);
  document.body.classList.add("modal-open");
  document.body.style.overflow = "hidden";
  setTimeout(() => { modalNode.classList.add("active"); safeFocus(usernameInput); }, 10);
}

// ==== Redes sociales (ya existente) ====
function renderSocialBar() {
  const bar = document.querySelector(".social-bar");
  if (!bar) return;
  bar.innerHTML = "";

  socials.forEach((s) => {
    const a = document.createElement("a");
    a.className = "social-tile";
    a.href = s.url || "#";
    a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("aria-label", s.name ? `Abrir ${s.name}` : "Abrir red social");

    const img = document.createElement("img");
    img.className = "social-img";
    img.alt = s.name || "Logo de red social";
    img.src = s.image || "";
    a.appendChild(img);

    bar.appendChild(a);
  });

  if (isAdmin) {
    const add = document.createElement("button");
    add.type = "button";
    add.className = "add-social-tile";
    add.setAttribute("aria-label", "Añadir red social");
    add.innerHTML = "+";
    add.addEventListener("click", openNewSocialModal);
    bar.insertBefore(add, bar.firstChild);
  }
}

function openNewSocialModal() {
  const modal = newSocialModalTemplate.content.cloneNode(true);
  const modalNode = modal.querySelector(".tw-modal");
  const form = modal.querySelector(".new-social-form");
  const nameInput = modal.querySelector(".new-social-name");
  const imageInput = modal.querySelector(".new-social-image-file");
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
    reader.onload = function (ev) {
      const entry = {
        name: (nameInput.value || "").trim(),
        image: ev.target.result,
        url
      };
      socials.unshift(entry);
      persistSocials();
      closeModal(modalNode, removeTrap, onEscape);
      renderSocialBar();
      alert("¡Red social añadida!");
    };
    reader.readAsDataURL(file);
  });

  modalNode.addEventListener("keydown", onEscape);
  modalClose.addEventListener("click", () => closeModal(modalNode, removeTrap, onEscape));
  modalNode.addEventListener("click", (e) => { if (e.target === modalNode) closeModal(modalNode, removeTrap, onEscape); });

  document.body.appendChild(modal);
  document.body.classList.add("modal-open");
  document.body.style.overflow = "hidden";
  setTimeout(() => { modalNode.classList.add("active"); safeFocus(nameInput); }, 10);
}

// ==== Controles y boot ====
function setupArrows() {
  const row = document.querySelector(".row");
  const carousel = row.querySelector(".carousel");
  const prev = row.querySelector(".arrow.prev");
  const next = row.querySelector(".arrow.next");
  if (!carousel || !prev || !next) return;

  function step() {
    const first = carousel.querySelector(".tile, .add-game-tile");
    if (!first) return 320;
    const rect = first.getBoundingClientRect();
    const styles = getComputedStyle(carousel);
    const gap = parseFloat(styles.columnGap || styles.gap || "14");
    return Math.ceil(rect.width + gap);
  }

  prev.addEventListener("click", () => carousel.scrollBy({ left: -step(), behavior: "smooth" }));
  next.addEventListener("click", () => carousel.scrollBy({ left: step(), behavior: "smooth" }));
}
function setupSearch() {
  const input = document.getElementById("searchInput");
  if (!input) return;
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    document.querySelectorAll(".tile .title").forEach((el) => {
      const match = el.textContent.toLowerCase().includes(q);
      el.closest(".tile").style.display = match ? "" : "none";
    });
  });
}
function setupKeyboardNav() {
  const carousel = document.querySelector(".carousel");
  document.addEventListener("keydown", (e) => {
    const dirs = ["ArrowLeft", "ArrowRight"];
    if (!dirs.includes(e.key)) return;
    const allTiles = [...document.querySelectorAll(".tile, .add-game-tile")];
    if (!allTiles.length) return;
    const active = (document.activeElement && (document.activeElement.classList.contains("tile") || document.activeElement.classList.contains("add-game-tile")))
      ? document.activeElement
      : allTiles[0];
    const tiles = [...carousel.querySelectorAll(".tile, .add-game-tile")];
    const idx = tiles.indexOf(active);
    if (e.key === "ArrowLeft" && idx > 0) {
      tiles[idx - 1].focus({ preventScroll: true });
      tiles[idx - 1].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
    if (e.key === "ArrowRight" && idx < tiles.length - 1) {
      tiles[idx + 1].focus({ preventScroll: true });
      tiles[idx + 1].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  });
}
function setupAdminButton() {
  const btn = document.querySelector(".user-pill");
  if (!btn) return;
  const clone = btn.cloneNode(true);
  btn.replaceWith(clone);
  clone.setAttribute("aria-label", isAdmin ? "Abrir opciones de administrador / Cerrar sesión" : "Iniciar sesión como administrador");
  clone.addEventListener("click", () => {
    if (isAdmin) {
      const ok = confirm("¿Cerrar sesión de administrador?");
      if (ok) {
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

renderRow();
setupArrows();
setupSearch();
setupKeyboardNav();
setupAdminButton();
renderHeroCarousel();
renderSocialBar();
