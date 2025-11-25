// ./sw.js
const CACHE_NAME = 'timetracker-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './assets/js/dexie-local.js',
  './assets/js/reports.js',
  './assets/js/cleanup.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});