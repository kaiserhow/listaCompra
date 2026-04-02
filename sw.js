// Service Worker - siempre network first, sin cache
const CACHE_NAME = 'lacompra-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Always go to network, never cache
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
