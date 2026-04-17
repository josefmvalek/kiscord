const CACHE_NAME = 'kiscord-v-vite-6';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/css/app.css',
    '/manifest.json',
    '/img/app/czippel2_kytka.jpg',
    '/img/app/czippel2_kytka-modified.png',
    '/img/app/klarka_profilovka.webp',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
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

    // Skip Supabase API calls
    if (url.hostname.includes('supabase.co')) return;

    // TEMPORARY DEV FIX: Network-First strategy to ensure latest files are loaded
    event.respondWith(
        fetch(event.request).then((networkResponse) => {
            // Update cache in background
            if (event.request.destination === 'image' || event.request.destination === 'font' || url.pathname.endsWith('.js')) {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
            }
            return networkResponse;
        }).catch(() => {
            // Fallback to cache if network fails
            return caches.match(event.request);
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
