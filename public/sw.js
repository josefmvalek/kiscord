// DŮLEŽITÉ: Při každém deployi změň číslo verze v CACHE_NAME,
// aby SW smazal starý cache a uživatelé dostali čerstvé soubory.
// Verze synchronizuj s APP_VERSION v js/main.js.
const CACHE_NAME = 'kiscord-v-vite-8';
const ASSETS_TO_CACHE = [
    '/manifest.json',
    '/img/app/czippel2_kytka.jpg',
    '/img/app/czippel2_kytka-modified.png',
    '/img/app/klarka_profilovka.webp',
];

// Install Event - DON'T cache index.html or CSS/JS assets (they have hash-based names that change on every build)
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log(`[SW] Caching static assets (${CACHE_NAME})`);
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Activate Event - clear all old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip Supabase API calls
    if (url.hostname.includes('supabase.co')) return;

    // ALWAYS use network for HTML and JS/CSS assets (they have hashed names, caching would break on deploy)
    const isHtml = url.pathname === '/' || url.pathname.endsWith('.html');
    const isHashedAsset = url.pathname.startsWith('/assets/');

    if (isHtml || isHashedAsset) {
        // Network-only: these must always be fresh
        event.respondWith(fetch(event.request));
        return;
    }

    // For images and fonts: Cache-First (they don't change)
    if (event.request.destination === 'image' || event.request.destination === 'font') {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;
                return fetch(event.request).then((networkResponse) => {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
                    return networkResponse;
                });
            })
        );
        return;
    }

    // Everything else: Network-First
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});

// Push Event — přijme zprávu ze serveru i při zavřené appce
self.addEventListener('push', (event) => {
    if (!event.data) return;

    let data = {};
    try {
        data = event.data.json();
    } catch (e) {
        data = { title: event.data.text() };
    }

    const title = data.title || 'Kiscord 💖';
    const options = {
        body: data.body || '',
        icon: '/img/app/czippel2_kytka.jpg',
        badge: '/img/app/czippel2_kytka-modified.png',
        tag: data.tag || 'kiscord-push',
        renotify: true,
        vibrate: [100, 50, 100],
        data: { url: data.url || '/' },
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click Event
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Zkus najít existující okno a focusnout ho
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Jinak otevři nové okno
            return clients.openWindow(targetUrl);
        })
    );
});
