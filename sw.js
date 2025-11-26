// sw.js - Service worker simple (cache-first)
const CACHE_NAME = 'time-tracker-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/assets/js/dexie.js',
  '/assets/js/lucide.min.js',
  '/assets/js/db.js',
  '/assets/js/utils.js',
  '/assets/js/track.js',
  '/assets/js/reports.js',
  '/assets/js/setup.js',
  '/assets/js/app.js'
  // agrega tus css y fonts locales aquí
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        // opcional: put dynamic fetches into cache
        return resp;
      }).catch(() => {
        // fallback si quieres: offline page
        return caches.match('/index.html');
      });
    })
  );
});