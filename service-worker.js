const CACHE_NAME = 'time-tracker-v2'; // Versión actualizada del cache
const urlsToCache = [
    '/',
    '/index (14).html',
    '/src/output.css',
    '/assets/js/dexie.js',
    '/assets/js/lucide.min.js',
    '/assets/js/db.js',
    '/assets/js/data.js',
    '/assets/js/app.js',
    '/manifest.json'
    // Agrega aquí las rutas a tus íconos y otros assets necesarios
];

// Instalación del Service Worker: Cacha los assets estáticos
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('SW: Cache abierta');
                return cache.addAll(urlsToCache);
            })
            .catch(err => console.error('SW: Error al cachear', err))
    );
});

// Activación del Service Worker: Limpia caches antiguos
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('SW: Eliminando caché antigua', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Estrategia Network-First con Fallback a Cache
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
            .catch(() => {
                // Si la red falla, intenta la caché
                return caches.match(event.request);
            })
    );
});
