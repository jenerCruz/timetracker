// Nombre de la caché para esta versión de la PWA
const CACHE_NAME = 'time-tracker-v1';

// Recursos esenciales que deben ser cacheados
// Incluye index.html, el script principal, y los CDNs externos que no cambian
const urlsToCache = [
    './', // Raíz, generalmente index.html
    'index.html',
    'app.js', // Aunque la lógica JS está en index.html, es buena práctica si estuviera separado.
              // En este caso, asumiremos que se mantiene en index.html y solo cacheamos los estáticos.
    'manifest.json',
    // CDNs externos utilizados:
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/lucide@latest',
    // Firebase CDN (versiones específicas usadas en index.html)
    "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js",
    "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js",
    "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"
];

// ----------------------------------------------------------------------
// 1. EVENTO INSTALL
// Se dispara cuando el Service Worker se instala por primera vez.
// Aquí abrimos la caché y guardamos los recursos esenciales.
// ----------------------------------------------------------------------
self.addEventListener('install', (event) => {
    // Espera hasta que el trabajo de caching haya terminado
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Cacheando shell de la aplicación');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Service Worker: Fallo al cachear recursos', error);
            })
    );
});

// ----------------------------------------------------------------------
// 2. EVENTO ACTIVATE
// Se dispara cuando el Service Worker antiguo es reemplazado por uno nuevo.
// Aquí limpiamos cachés antiguas para liberar espacio.
// ----------------------------------------------------------------------
self.addEventListener('activate', (event) => {
    // Definimos los nombres de caché que queremos conservar
    const cacheWhitelist = [CACHE_NAME];

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Si el nombre de caché no está en la lista blanca, lo eliminamos
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Service Worker: Eliminando caché antigua:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Aseguramos que el Service Worker tome el control de las páginas existentes
    return self.clients.claim();
});


// ----------------------------------------------------------------------
// 3. EVENTO FETCH
// Se dispara cada vez que el navegador solicita un recurso.
// Aquí interceptamos la solicitud y servimos desde la caché si está disponible.
// Estrategia: Cache, Fallback a Network.
// ----------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
    event.respondWith(
        // 1. Buscamos el recurso en la caché
        caches.match(event.request)
            .then((response) => {
                // Si encontramos una respuesta en la caché, la devolvemos
                if (response) {
                    return response;
                }

                // 2. Si no está en caché, vamos a la red
                return fetch(event.request).then(
                    (response) => {
                        // Comprobamos si recibimos una respuesta válida
                        if(!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clonamos la respuesta. Un stream solo puede ser consumido una vez.
                        const responseToCache = response.clone();

                        // 3. Guardamos la nueva respuesta en caché para futuros usos
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                // Evitamos cachear peticiones POST o API específicas para no ensuciar
                                if (event.request.method === 'GET' && urlsToCache.includes(event.request.url) || event.request.url.startsWith('https://cdn')) {
                                     cache.put(event.request, responseToCache);
                                }
                            });

                        return response;
                    }
                ).catch((error) => {
                    // Si la red falla y no estaba en caché, podemos servir una página de fallback
                    console.error('Service Worker: Fallo en la red y no hay caché para:', event.request.url, error);
                    // Aquí se podría implementar una página offline personalizada si existiera.
                });
            })
    );
});
