// sw.js (Bloque INSTALL corregido)

// Aumenta la versión para forzar la actualización
const CACHE_NAME = 'time-tracker-v5'; 
// (Mantén aquí tu lista urlsToCache anterior, pero asegúrate de que sea la más precisa)
const urlsToCache = [
    '/',
    'index (14).html', 
    'src/output.css', 
    'manifest.json',
    'assets/js/dexie.js',
    'assets/js/lucide.min.js',
    'assets/js/db.js',
    'assets/js/data.js',
    'assets/js/app.js',
    'assets/icons/icon-192x192.png', 
    'assets/icons/icon-512x512.png'
];

// Instalación del Service Worker: Cacha los assets estáticos
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('SW: Cache abierta. Intentando cachear recursos individualmente...');
                
                // USAMOS PROMISE.ALL con .map y .catch() para hacer la caché tolerante a fallos 
                // La instalación solo fallará si el caché en sí no puede abrirse.
                return Promise.all(
                    urlsToCache.map(url => {
                        return cache.add(url)
                            .then(() => console.log(`SW: Cacheado con éxito: ${url}`))
                            .catch(err => {
                                console.warn(`SW: Falló al cachear ${url}. Ignorando error para no abortar la instalación.`, err);
                                // IMPORTANTE: Devolvemos un valor resuelto para que Promise.all no falle
                                return Promise.resolve(); 
                            });
                    })
                );
            })
            // Forzar activación inmediata
            .then(() => self.skipWaiting()) 
            .catch(err => console.error('SW: Error crítico al cachear la lista completa (esto ya no debería pasar)', err))
    );
});
