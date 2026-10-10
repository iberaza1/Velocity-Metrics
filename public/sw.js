
const CACHE_NAME = 'velocity-v5';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// Install Event: Cache the application shell immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event:
// - Navigations / index.html: network-first so new deploys load right away; cache is the offline fallback.
// - Other same-origin GETs: stale-while-revalidate (hashed /assets files never change).
// - Cross-origin and /api requests are not intercepted.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  const isNavigation = req.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('/index.html');

  if (isNavigation) {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match('./index.html').then((cached) => cached || Response.error()))
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(req).then((cachedResponse) => {
        const fetchPromise = fetch(req).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            cache.put(req, networkResponse.clone());
          }
          return networkResponse;
        }).catch((err) => {
          console.warn('[SW] Network fetch failed, relying on cache (if available):', err);
          return cachedResponse || Response.error();
        });

        return cachedResponse || fetchPromise;
      });
    })
  );
});
