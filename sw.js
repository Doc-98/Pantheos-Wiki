// Change this version number whenever you update your wiki content to force browsers to update their cache
const VERSION = 'v1.0.0';
const CACHE_NAME = `pantheos-wiki-${VERSION}`;

// The specific assets we want to force-cache immediately on install
const ASSETS = [
  '/Pantheos-Wiki/',
  '/Pantheos-Wiki/index.html',
  '/Pantheos-Wiki/assets/icon-192.png',
  '/Pantheos-Wiki/assets/icon-512.png',
  // MkDocs offline fallback handling
  '/Pantheos-Wiki/404.html'
];

// 1. Install Event: Cache core app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching App Shell');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting()) // Forces the waiting service worker to become active
  );
});

// 2. Activate Event: Clean up older versions of the cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting Old Cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim()) // Forces the service worker to take control of the page immediately
  );
});

// 3. Fetch Event: Network-first falling back to cache strategy (Best for dynamically built wikis)
self.addEventListener('fetch', (event) => {
  // Only handle standard http/https requests (ignores chrome extensions, etc.)
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If the network request is successful, clone it and drop it in the cache
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // If the network fails (offline), try to serve the file from the cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If the specific page isn't cached and they are offline, show the 404 page
          return caches.match('/Pantheos-Wiki/404.html');
        });
      })
  );
});