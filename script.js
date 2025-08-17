// ---------- Datos (demo): añade previewVideo con la ruta de cada trailer
const data = {
  destacados: [
    {
      title: "Grounded 2",
      image: "assets/images/Juegos/grounded2/cover.jpg",
      description: "Explora un mundo en miniatura lleno de aventuras y peligros. ¡Sobrevive como un insecto en Grounded 2!",
      downloadUrl: "assets/downloads/grounded2.zip",
      detailsUrl: "#"
    },
    {
      title: "En proceso",
      image: "assets/images/construction/en-proceso.svg",
      description: "Este juego está en desarrollo. ¡Vuelve pronto para más detalles!",
      downloadUrl: "#",
      detailsUrl: "#"
    }
  ],
  recientes: [
    {
      title: "Grounded 2",
      image: "assets/images/Juegos/grounded2/cover.jpg",
      previewVideo: "assets/video/grounded2/trailer.mp4", // ← tu ruta por juego
      description: "Explora un mundo en miniatura lleno de aventuras y peligros. ¡Sobrevive como un insecto en Grounded 2!",
      downloadUrl: "assets/downloads/grounded2.zip",
      detailsUrl: "#"
    },
    {
      title: "Nueva publicacion",
      image: "assets/images/Juegos/*****/cover.jpg",
      previewVideo: "assets/video/****/trailer.mp4", // ← tu ruta por juego
      description: "ejemplo",
      downloadUrl: "assets/downloads/****.zip",
      detailsUrl: "#"
    },
  ],
  favoritos: [
    {
      title: "En proceso",
      image: "assets/images/construction/en-proceso.svg",
      description: "Este juego está en desarrollo. ¡Vuelve pronto para más detalles!",
      downloadUrl: "#",
      detailsUrl: "#"
    }
  ],
  gamepass: [
    {
      title: "En proceso",
      image: "assets/images/construction/en-proceso.svg",
      description: "Este juego está en desarrollo. ¡Vuelve pronto para más detalles!",
      downloadUrl: "#",
      detailsUrl: "#"
    }
  ]
};

// ---------- Plantillas
const template = document.getElementById("tile-template");
const modalTemplate = document.getElementById("game-modal-template");
const adminLoginModalTemplate = document.getElementById("admin-login-modal-template");
const newGameModalTemplate = document.getElementById("new-game-modal-template");

// ---------- Estado / persistencia
const LS_RECENTES = "tgx_recientes";
const LS_ADMIN = "tgx_is_admin";

let isAdmin = false;
rehydrate();

function rehydrate() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_RECENTES) || "null");
    if (Array.isArray(saved)) data.recientes = saved;
  } catch {}
  isAdmin = localStorage.getItem(LS_ADMIN) === "1";
}
function persistRecientes() {
  try { localStorage.setItem(LS_RECENTES, JSON.stringify(data.recientes)); } catch {}
}
function persistAdmin(flag) {
  try { localStorage.setItem(LS_ADMIN, flag ? "1" : "0"); } catch {}
}

// ---------- Utils
function preload(src) { if (!src) return; const i = new Image(); i.src = src; }
function safeFocus(el) { try { el && el.focus && el.focus(); } catch {} }
const ROW_KEYS = ["recientes", "favoritos", "gamepass", "destacados"];
function findGameRef(game) {
  for (const row of ROW_KEYS) {
    const idx = (data[row] || []).findIndex(g => g.title === game.title && g.image === game.image);
    if (idx !== -1) return { row, index: idx };
  }
  return null;
}

// Trap de foco para modales
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

// ---------- Render de filas
function renderRow(rowName) {
  const container = document.querySelector(`.carousel[data-row="${rowName}"]`);
  if (!container) return;
  container.innerHTML = "";
  const items = data[rowName] || [];

  items.forEach((g) => {
    const node = template.content.cloneNode(true);
    const tile = node.querySelector(".tile");
    const cover = node.querySelector(".cover");
    const title = node.querySelector(".title");
    const vid = node.querySelector(".tile-video");

    // Imagen de portada
    cover.style.backgroundImage = `url(${g.image})`;
    preload(g.image);

    // Video preview: el video ya existe en el template; solo conectamos eventos
    if (vid && g.previewVideo) {
      vid.poster = g.image;
      // Carga perezosa: solo se asigna src al primer hover/focus
      let loaded = false;
      const ensureSrc = () => {
        if (!loaded) {
          vid.src = g.previewVideo;
          loaded = true;
        }
      };
      const start = () => {
        ensureSrc();
        vid.currentTime = 0;
        const p = vid.play();
        if (p && p.catch) p.catch(() => {});
      };
      const stop = () => { vid.pause(); vid.currentTime = 0; };

      // Mostrar video solo cuando realmente está reproduciendo
      const show = () => vid.classList.add("playing");
      const hide = () => vid.classList.remove("playing");
      vid.addEventListener("playing", show);
      vid.addEventListener("pause", hide);
      vid.addEventListener("ended", hide);
      vid.addEventListener("error", () => { vid.remove(); });

      // Hover/focus
      tile.addEventListener("pointerenter", start);
      tile.addEventListener("pointerleave", stop);
      tile.addEventListener("focus", start);
      tile.addEventListener("blur", stop);
    }

    // Click abre modal
    title.textContent = g.title;
    tile.tabIndex = 0;
    tile.addEventListener("click", () => openGame(g));
    container.appendChild(node);
  });

  // Tile de añadir (solo admin, en 'recientes')
  if (isAdmin && rowName === "recientes") {
    const addTile = document.createElement("div");
    addTile.className = "add-game-tile";
    addTile.tabIndex = 0;
    addTile.innerHTML = "<span>+ Añadir juego</span>";
    addTile.addEventListener("click", openNewGameModal);
    container.insertBefore(addTile, container.firstChild);
  }
}

// ---------- Hero / destacados
let heroTimer = null;
function renderHeroCarousel() {
  const heroCarousel = document.querySelector(".hero-carousel");
  const heroArt = document.querySelector(".hero-art");
  if (!heroCarousel || !data.destacados) return;

  heroCarousel.innerHTML = "";
  data.destacados.forEach((g, index) => {
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
    openGame(data.destacados[i >= 0 ? i : 0]);
  });
  heroArt.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const i = getActiveIndex();
      openGame(data.destacados[i >= 0 ? i : 0]);
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

  heroArt.addEventListener("mouseenter", stop);
  heroArt.addEventListener("mouseleave", start);
  start();
}

// ---------- Modales (juego) + menú admin
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
  modalDescription.textContent = game.description || "Sin descripción";
  modalDownload.addEventListener("click", () => { if (game.downloadUrl) window.location.href = game.downloadUrl; });
  modalSecondary.addEventListener("click", () => { if (game.detailsUrl) window.location.href = game.detailsUrl; });

  // Botón de 3 puntos (solo admin)
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
          modalDescription.textContent = updated.description;
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

// ---------- Eliminar publicación
function deleteGame(game, currentModalNode) {
  const ref = findGameRef(game);
  if (!ref) { alert("No se encontró la publicación."); return; }
  const arr = data[ref.row];
  arr.splice(ref.index, 1);
  if (ref.row === "recientes") persistRecientes();
  ["recientes", "favoritos", "gamepass"].forEach(renderRow);
  if (currentModalNode) closeModal(currentModalNode);
  alert("Publicación eliminada.");
}

// ---------- Editar publicación (reusa el modal de 'nuevo juego')
function openEditGame(original, currentModalNode, opts = {}) {
  const modal = newGameModalTemplate.content.cloneNode(true);
  const node = modal.querySelector(".tw-modal");
  const form = modal.querySelector(".new-game-form");
  const titleInput = modal.querySelector(".new-game-title");
  const descriptionInput = modal.querySelector(".new-game-description");
  const imageInput = modal.querySelector(".new-game-image-file");
  const modalClose = modal.querySelector(".tw-modal-close");

  titleInput.value = original.title || "";
  descriptionInput.value = original.description || "";
  imageInput.required = false;

  const removeTrap = trapFocus(node);
  const onEscape = (e) => { if (e.key === "Escape") closeModal(node, removeTrap, onEscape); };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const ref = findGameRef(original);
    if (!ref) { alert("No se encontró la publicación."); return; }
    const arr = data[ref.row];
    const current = arr[ref.index];

    const applyUpdate = (imgBase64) => {
      const updated = {
        ...current,
        title: titleInput.value.trim() || current.title,
        description: descriptionInput.value.trim() || current.description,
        image: imgBase64 || current.image
      };
      arr[ref.index] = updated;
      if (ref.row === "recientes") persistRecientes();
      ["recientes", "favoritos", "gamepass"].forEach(renderRow);
      closeModal(node, removeTrap, onEscape);
      if (typeof opts.onUpdated === "function") opts.onUpdated(updated);
      alert("Publicación actualizada.");
    };

    const file = imageInput.files && imageInput.files[0];
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

// ---------- Modal login admin
function openAdminLoginModal() {
  const modal = adminLoginModalTemplate.content.cloneNode(true);
  const modalNode = modal.querySelector(".tw-modal");
  const form = modal.querySelector(".admin-login-form");
  const usernameInput = modal.querySelector(".admin-username");
  const pinInput = modal.querySelector(".admin-pin");
  const modalClose = modal.querySelector(".tw-modal-close");

  const removeTrap = trapFocus(modalNode);
  const onEscape = (e) => { if (e.key === "Escape") closeModal(modalNode, removeTrap, onEscape); };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!/^\d{4,6}$/.test(pinInput.value.trim())) { alert("El PIN debe ser numérico de 4 a 6 dígitos."); pinInput.focus(); return; }
    if (usernameInput.value === "TROLOT-2144" && pinInput.value === "3315") {
      isAdmin = true;
      persistAdmin(true);
      closeModal(modalNode, removeTrap, onEscape);
      renderRow("recientes");
      alert("¡Sesión iniciada como admin!");
    } else {
      alert("Usuario o PIN incorrectos");
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

// ---------- Modal nuevo juego
function openNewGameModal() {
  const modal = newGameModalTemplate.content.cloneNode(true);
  const modalNode = modal.querySelector(".tw-modal");
  const form = modal.querySelector(".new-game-form");
  const titleInput = modal.querySelector(".new-game-title");
  const descriptionInput = modal.querySelector(".new-game-description");
  const imageInput = modal.querySelector(".new-game-image-file");
  const trailerFileInput = modal.querySelector(".new-game-trailer-file");
  const trailerUrlInput = modal.querySelector(".new-game-trailer-url");
  const downloadInput = modal.querySelector(".new-game-download");
  const modalClose = modal.querySelector(".tw-modal-close");

  const removeTrap = trapFocus(modalNode);
  const onEscape = (e) => { if (e.key === "Escape") closeModal(modalNode, removeTrap, onEscape); };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const file = imageInput?.files?.[0];
    if (!file) { alert("Por favor selecciona una imagen."); return; }

    const reader = new FileReader();
    reader.onload = function (ev) {
      let trailer = (trailerUrlInput?.value || "").trim();
      const trailerFile = trailerFileInput?.files?.[0] || null;
      if (!trailer && trailerFile) { try { trailer = URL.createObjectURL(trailerFile); } catch {} }
      const newGame = {
        title: titleInput.value.trim() || "Sin título",
        image: ev.target.result,
        description: descriptionInput.value.trim() || "",
        downloadUrl: (downloadInput?.value || "#").trim(),
        detailsUrl: "#",
        previewVideo: trailer || ""
      };
      data.recientes.unshift(newGame);
      persistRecientes();
      closeModal(modalNode, removeTrap, onEscape);
      renderRow("recientes");
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

// ---------- Flechas de scroll
function setupArrows() {
  document.querySelectorAll(".row").forEach((row) => {
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
  });
}

// ---------- Búsqueda
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

// ---------- Navegación con teclado
function setupKeyboardNav() {
  const rows = [...document.querySelectorAll(".carousel")];
  document.addEventListener("keydown", (e) => {
    const dirs = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    if (!dirs.includes(e.key)) return;

    const allTiles = [...document.querySelectorAll(".tile, .add-game-tile")];
    if (!allTiles.length) return;

    const active = (document.activeElement && (document.activeElement.classList.contains("tile") || document.activeElement.classList.contains("add-game-tile")))
      ? document.activeElement
      : allTiles[0];

    const parent = active.closest(".carousel") || rows[0];
    const tiles = [...parent.querySelectorAll(".tile, .add-game-tile")];
    const idx = tiles.indexOf(active);

    if (e.key === "ArrowLeft" && idx > 0) {
      tiles[idx - 1].focus({ preventScroll: true });
      tiles[idx - 1].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
    if (e.key === "ArrowRight" && idx < tiles.length - 1) {
      tiles[idx + 1].focus({ preventScroll: true });
      tiles[idx + 1].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      const currentRowIndex = rows.indexOf(parent);
      const nextRowIndex = e.key === "ArrowUp" ? currentRowIndex - 1 : currentRowIndex + 1;
      if (rows[nextRowIndex]) {
        const targetRowTiles = [...rows[nextRowIndex].querySelectorAll(".tile, .add-game-tile")];
        const target = targetRowTiles[Math.min(Math.max(idx, 0), targetRowTiles.length - 1)];
        if (target) {
          target.focus({ preventScroll: true });
          target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }
      }
    }
  });
}

// ---------- Acciones del hero / admin
function setupHeroActions() {
  const play = document.getElementById("playNowBtn");
  const queue = document.getElementById("queueBtn");
  if (play) play.addEventListener("click", () => openGame(data.destacados[0]));
  if (queue) queue.addEventListener("click", () => alert("Añadido a la cola"));
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
        renderRow("recientes");
        setupAdminButton();
        alert("Sesión cerrada.");
      }
    } else {
      openAdminLoginModal();
    }
  });
}

// ---------- Render inicial
["recientes", "favoritos", "gamepass"].forEach(renderRow);
setupArrows();
setupSearch();
setupKeyboardNav();
setupHeroActions();
setupAdminButton();
renderHeroCarousel();
