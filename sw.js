const CACHE_NAME = 'kiscord-v27';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/manifest.json',
    '/js/main.js',
    '/js/core/state.js',
    '/js/core/supabase.js',
    '/js/core/offline.js',
    '/js/core/theme.js',
    '/js/core/utils.js',
    '/js/core/ui.js',
    '/js/core/sync.js',
    '/js/core/auth.js',
    '/js/modules/dashboard.js',
    '/js/modules/levels.js',
    '/img/app/czippel2_kytka-modified.webp',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js'
];

// Install Event
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log(`[SW] Caching system assets (${CACHE_NAME})`);
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Activate Event
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

    // Skip Supabase API calls (let the offline.js handle them)
    if (url.hostname.includes('supabase.co')) return;

    // Strategy: Cache-First for static assets, Network-First for others
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;

            return fetch(event.request).then((networkResponse) => {
                // Cache images and fonts dynamically
                if (
                    event.request.destination === 'image' || 
                    event.request.destination === 'font' ||
                    url.pathname.endsWith('.js')
                ) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Fallback for offline (optional: return a default image if image fails)
                return null;
            });
        })
    );
});

// Notification Click Event
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    // Focus existing window or open new one
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            if (clientList.length > 0) {
                let client = clientList[0];
                for (let i = 0; i < clientList.length; i++) {
                    if (clientList[i].focused) {
                        client = clientList[i];
                    }
                }
                return client.focus();
            }
            return clients.openWindow('/');
        })
    );
});

