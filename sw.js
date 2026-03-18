const CACHE_NAME = "kiscord-v3-vercel";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/img/app/czippel2_kytka-modified.png",
  "/img/app/klarka_profilovka.webp",
  "/img/app/jozka_profilovka.jpg",
  // Externí knihovny
  "https://cdn.tailwindcss.com",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
];

// 1. INSTALACE: Uložíme vše do cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching assets");
      return cache.addAll(ASSETS_TO_CACHE);
    }),
  );
});

// 2. AKTIVACE: Vyčistíme staré cache (když změníš verzi)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        }),
      );
    }),
  );
});

// 3. FETCH: Když není internet, bereme z cache
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Pokud je v cache, vrátíme to. Pokud ne, zkusíme internet.
      return (
        response ||
        fetch(event.request).catch(() => {
          // Pokud selže i internet (jsme offline a nemáme to v cache),
          // tady bychom mohli vrátit nějakou "offline stránku",
          // ale pro SPA stačí, když vrátíme index.html (pokud jde o navigaci).
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        })
      );
    }),
  );
});
