
const CACHE_NAME = 'velocity-v3-swr';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './index.tsx',
  './App.tsx',
  './types.ts',
  './utils/conversions.ts',
  './services/geminiService.ts',
  './components/Tracker.tsx',
  './components/Dashboard.tsx',
  './components/Coach.tsx',
  './components/Goals.tsx'
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

// Fetch Event: Stale-While-Revalidate Strategy
// Serves from cache immediately for speed, then updates cache from network in background.
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and avoid chrome-extensions or non-http(s) schemes
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // Only cache successful standard responses
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch((err) => {
          console.warn('[SW] Network fetch failed, relying on cache (if available):', err);
          return cachedResponse;
        });

        // Return the cached response if it exists, otherwise wait for the network
        return cachedResponse || fetchPromise;
      });
    })
  );
});
