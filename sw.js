const CACHE_NAME = "kiscord-v6-scrolling-fix";
// KRITICKÁ OPRAVA: Cachujeme POUZE lokální assety.
// CDN URL vedly k selhání celé instalace (cache.addAll je atomické).
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/style.css",
  "/manifest.json",
  "/img/app/czippel2_kytka-modified.webp",
  "/img/app/klarka_profilovka.webp",
  "/img/app/jozka_profilovka.jpg",
  "/img/app/czippel2_vanoce.webp",
];

// 1. INSTALL
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Caching local assets");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // Aktivuj nový SW ihned, bez čekání
});

// 2. ACTIVATE – smaž staré cache
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) =>
      Promise.all(
        keyList.map((key) => key !== CACHE_NAME && caches.delete(key))
      )
    )
  );
  return self.clients.claim(); // Převezmi kontrolu nad stávajícími stránkami ihned
});

// 3. FETCH – Network-First pro JS, Cache-First pro obrázky, Network pro Supabase
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Supabase API volání – NIKDY necachovat
  if (url.hostname.includes("supabase.co")) {
    return; // Nech projít beze změny
  }

  // CDN (Tailwind, FontAwesome, Google Fonts) – zkus network, fallback cache
  if (!url.hostname.includes("localhost") && url.hostname !== location.hostname) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // JS moduly – Network-First (zajistí, že deploy aktualizace vidí uživatelé ihned)
  if (url.pathname.startsWith("/js/") || url.pathname.endsWith(".js")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Ulož do cache pro offline
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Obrázky – Cache-First (šetří bandwidth)
  if (url.pathname.match(/\.(jpg|jpeg|png|webp|gif|svg|ico)$/)) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) => cached || fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
      )
    );
    return;
  }

  // HTML navigace (F5, přímý link) – Network-First, fallback na index.html
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Výchozí – Network s cache fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
