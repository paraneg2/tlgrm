
const catalog = document.getElementById("catalog");
const viewer = document.getElementById("productViewer");
const video = document.getElementById("productVideo");

const toggle = document.getElementById("viewToggle");
const viewIcon = document.getElementById("viewIcon");
const closeButton = document.getElementById("closeViewer");
const soundButton = document.getElementById("soundToggle");

const CURRENCY = "€";

let products = [];
let currentIndex = 0;
let soundWanted = true;
let viewMode = localStorage.getItem("catalog-view") || "grid";

const telegram = window.Telegram?.WebApp;

if (telegram) {
  telegram.ready();
  telegram.expand();
}

function formatPrice(price) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: CURRENCY
  }).format(price);
}

async function loadProducts() {
  try {
    const response = await fetch("products.json");
    if (!response.ok) throw new Error("No se pudo cargar el catálogo");

    const data = await response.json();

    products = data
      .filter(product => product.active)
      .slice(0, 20);

    renderCatalog();
  } catch (error) {
    catalog.innerHTML =
      '<p>No se ha podido cargar el catálogo.</p>';
    console.error(error);
  }
}

function renderCatalog() {
  catalog.innerHTML = "";
  catalog.className =
    "catalog " + (viewMode === "grid" ? "grid-view" : "carousel-view");

  viewIcon.textContent = viewMode === "grid" ? "▤" : "▦";

  products.forEach((product, index) => {
    const card = document.createElement("article");
    card.className = "product-card";

    const img = document.createElement("img");
    img.className = "product-image";
    img.src = product.image;
    img.alt = product.name;
    img.loading = "lazy";

    const details = document.createElement("div");
    details.className = "product-details";

    const name = document.createElement("div");
    name.className = "product-name";
    name.textContent = product.name;

    const price = document.createElement("div");
    price.className = "product-price";
    price.textContent = formatPrice(product.price);

    details.append(name, price);
    card.append(img, details);

    card.addEventListener("click", () => openProduct(index));

    catalog.appendChild(card);
  });
}

toggle.addEventListener("click", () => {
  viewMode = viewMode === "grid" ? "carousel" : "grid";
  localStorage.setItem("catalog-view", viewMode);
  renderCatalog();
});

function openProduct(index) {
  if (!products.length) return;

  currentIndex = index;
  viewer.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  if (telegram) {
    telegram.BackButton.show();
  }

  showProduct();
}

function showProduct() {
  const product = products[currentIndex];

  document.getElementById("viewerName").textContent = product.name;
  document.getElementById("viewerPrice").textContent =
    formatPrice(product.price);
  document.getElementById("viewerDescription").textContent =
    product.description || "";

  video.pause();
  video.removeAttribute("src");
  video.load();

  video.src = product.video;
  video.muted = !soundWanted;
  video.load();

  soundButton.textContent = soundWanted ? "🔊" : "🔇";

  video.play().then(() => {
    soundButton.textContent = video.muted ? "🔇" : "🔊";
  }).catch(async () => {
    // Si el navegador bloquea el sonido automático,
    // intentamos reproducir el vídeo en silencio.
    video.muted = true;

    try {
      await video.play();
      soundButton.textContent = "🔇";
    } catch (error) {
      soundButton.textContent = "▶";
      console.warn("El navegador requiere interacción para reproducir.");
    }
  });
}

soundButton.addEventListener("click", async () => {
  if (video.paused) {
    try {
      await video.play();
    } catch (error) {
      console.warn(error);
    }
  }

  video.muted = !video.muted;
  soundWanted = !video.muted;

  soundButton.textContent = video.muted ? "🔇" : "🔊";
});

function closeProduct() {
  video.pause();
  video.removeAttribute("src");
  video.load();

  viewer.classList.add("hidden");
  document.body.style.overflow = "";

  if (telegram) {
    telegram.BackButton.hide();
  }
}

closeButton.addEventListener("click", closeProduct);

if (telegram) {
  telegram.BackButton.onClick(closeProduct);
}

function changeProduct(direction) {
  const nextIndex = currentIndex + direction;

  if (nextIndex < 0 || nextIndex >= products.length) return;

  currentIndex = nextIndex;
  showProduct();
}

// Gestos verticales
let startY = 0;
let startX = 0;

viewer.addEventListener("touchstart", event => {
  startY = event.changedTouches[0].clientY;
  startX = event.changedTouches[0].clientX;
}, { passive: true });

viewer.addEventListener("touchend", event => {
  const endY = event.changedTouches[0].clientY;
  const endX = event.changedTouches[0].clientX;

  const diffY = startY - endY;
  const diffX = startX - endX;

  if (Math.abs(diffY) > 55 && Math.abs(diffY) > Math.abs(diffX)) {
    changeProduct(diffY > 0 ? 1 : -1);
  }
}, { passive: true });

// También permite navegar con las flechas del teclado.
document.addEventListener("keydown", event => {
  if (viewer.classList.contains("hidden")) return;

  if (event.key === "ArrowUp") changeProduct(-1);
  if (event.key === "ArrowDown") changeProduct(1);
  if (event.key === "Escape") closeProduct();
});

loadProducts();
