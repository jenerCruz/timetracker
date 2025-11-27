// assets/js/map.js
(function () {
    const GIST_LOCATIONS_KEY = 'gistIdLocations';
    const SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 hora
    const DISTANCE_THRESHOLD_M = 100; // 100 metros

    // --- FUNCIÓN DE RENDERIZADO DE VISTA ---

    async function renderMapView() {
        const contentArea = document.getElementById('content-area');
        
        contentArea.innerHTML = `
            <h2 class="text-3xl font-bold mb-6 text-gray-800">Mapa de Ubicaciones</h2>
            <div class="card p-6 mb-6">
                <p class="text-gray-700 font-semibold mb-3">Última Ubicación Conocida de Empleados</p>
                <div id="map-container" class="w-full h-64 bg-gray-200 flex items-center justify-center rounded-lg shadow-inner">
                    <p class="text-gray-500 text-center">
                        [Aquí se cargaría el mapa y los marcadores]
                        <br>
                        Sincronización de ubicación:
                        <span class="font-semibold text-sm">Cada ${SYNC_INTERVAL_MS / 3600000} hora (si el movimiento > ${DISTANCE_THRESHOLD_M}m)</span>
                    </p>
                </div>
            </div>

            <div class="card p-6">
                <h3 class="text-xl font-semibold mb-3">Configuración de Ubicación</h3>
                <p class="text-sm text-gray-500 mb-4">
                    ID Gist exclusivo para la sincronización de ubicaciones.
                </p>
                <input type="text" id="gistIdLocations" onchange="localStorage.setItem('${GIST_LOCATIONS_KEY}', this.value)" 
                       value="${localStorage.getItem(GIST_LOCATIONS_KEY) || ''}" 
                       placeholder="ID Gist Ubicaciones (Ej: e1f2g3h...)" 
                       class="w-full border-gray-300 rounded-lg p-2">
                <p class="text-sm text-blue-600 mt-2">Próxima Sincronización: <span id="next-sync-time">Calculando...</span></p>
            </div>
        `;
        
        updateNextSyncTimeDisplay();
        safeCreateIcons();
    }

    // --- LÓGICA DE SINCRONIZACIÓN DE UBICACIÓN PERIÓDICA Y CONDICIONAL ---

    async function syncLocation() {
        const gistId = localStorage.getItem(GIST_LOCATIONS_KEY);
        const token = localStorage.getItem('githubToken');
        const anonId = localStorage.getItem('anonId'); 

        if (!gistId || !token || !anonId) {
            console.warn("Faltan credenciales (Gist ID Ubicación, Token o AnonId). Omite la sincronización de ubicación.");
            updateNextSyncTimeDisplay();
            setTimeout(syncLocation, SYNC_INTERVAL_MS);
            return;
        }

        try {
            console.log(`Iniciando check de ubicación para ${anonId}...`);
            const currentLocation = await getCurrentLocation(15000); // 15s timeout
            if (currentLocation.lat === 0 && currentLocation.lng === 0) {
                console.warn("Ubicación no disponible o denegada. Omitiendo actualización.");
                updateNextSyncTimeDisplay();
                setTimeout(syncLocation, SYNC_INTERVAL_MS);
                return;
            }

            // Usamos localStorage para simular el almacenamiento de la última ubicación enviada.
            // En una solución real, leerías esto del Gist antes de escribir.
            const lastLocationStr = localStorage.getItem(`lastLocationSent_${anonId}`);
            let lastLocation = lastLocationStr ? JSON.parse(lastLocationStr) : null;
            
            let shouldUpdate = true;
            
            if (lastLocation) {
                const distance = getDistance(
                    currentLocation.lat, 
                    currentLocation.lng, 
                    lastLocation.lat, 
                    lastLocation.lng
                );
                
                // Condición: Si la distancia es menor o igual al umbral (100m), NO actualiza
                if (distance <= DISTANCE_THRESHOLD_M) {
                    shouldUpdate = false;
                    console.log(`Distancia (${distance.toFixed(2)}m) dentro del umbral (${DISTANCE_THRESHOLD_M}m). No se actualiza Gist.`);
                } else {
                    console.log(`Distancia fuera del umbral (${distance.toFixed(2)}m). Actualizando Gist.`);
                }
            }

            if (shouldUpdate) {
                const locationData = {
                    anonId: anonId,
                    timestamp: Date.now(),
                    lat: currentLocation.lat,
                    lng: currentLocation.lng,
                };
                
                // NOTA: Aquí se necesitaría una función específica en data.js para 
                // actualizar el Gist de ubicaciones de manera optimizada (ej. solo el archivo locations.json)
                
                // SIMULACIÓN: Guardamos la ubicación actual como la última enviada
                localStorage.setItem(`lastLocationSent_${anonId}`, JSON.stringify(currentLocation));
                
                showMessage('Ubicación (movimiento > 100m) actualizada con Gist.', 'info', true);
            }
            
        } catch (error) {
            console.error("Error en la sincronización de ubicación:", error);
        }
        
        // Re-programar el siguiente check
        updateNextSyncTimeDisplay();
        setTimeout(syncLocation, SYNC_INTERVAL_MS);
    }
    
    function updateNextSyncTimeDisplay() {
        const nextSyncElement = document.getElementById('next-sync-time');
        if (nextSyncElement) {
            const nextSyncTime = new Date(Date.now() + SYNC_INTERVAL_MS);
            nextSyncElement.textContent = nextSyncTime.toLocaleTimeString();
        }
    }

    function startLocationSync() {
        // Ejecutar inmediatamente al inicio y luego con el intervalo
        syncLocation();
    }

    // export
    window.renderMapView = renderMapView;
    window.startLocationSync = startLocationSync;
})();
