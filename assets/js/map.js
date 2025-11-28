// assets/js/map.js
// Mapa híbrido: Leaflet (cuando hay internet) + fallback offline (imagen/svg).
// - Valida distancia respecto al último clockIn (100m por defecto)
// - Guarda alertas en tabla 'slerts' usando window.put
// - Se integra con data.js para sincronizar ubicaciones si deseas (opcional)

(function () {
  const RADIUS_METERS = 100;
  const POLL_INTERVAL_MS = 10_000; // 10s
  let leafletLoaded = false;
  let mapInstance = null;
  let userMarker = null;
  let pollTimer = null;

  // Haversine (metros)
  function haversine(a, b) {
    const toRad = v => (v * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const sinDLat = Math.sin(dLat / 2);
    const sinDLon = Math.sin(dLon / 2);
    const aa = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
    const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
    return R * c;
  }
  function getDistanceMeters(a, b) {
    if (window.getDistance && typeof window.getDistance === 'function') {
      try {
        const d = window.getDistance(a.lat, a.lng, b.lat, b.lng);
        if (typeof d === 'number') return d;
      } catch (e) {}
    }
    return haversine(a, b);
  }

  // Obtiene la referencia de check-in más reciente del usuario actual
  async function getReferenceLocationForUser() {
    try {
      const anonId = localStorage.getItem('anonId') || null;
      const entries = await (window.getAll ? window.getAll('timeEntries') : []);
      if (!entries || entries.length === 0) return null;
      // priorizar entries del usuario
      const userEntries = entries.filter(e => String(e.employeeId) === String(anonId) || !e.employeeId);
      if (userEntries.length === 0) return null;
      userEntries.sort((a,b) => (b.clockIn || 0) - (a.clockIn || 0));
      for (const e of userEntries) {
        if (e.clockInCoords && typeof e.clockInCoords.lat === 'number' && typeof e.clockInCoords.lng === 'number') {
          return { lat: e.clockInCoords.lat, lng: e.clockInCoords.lng, entryId: e.id, storeId: e.storeId || null };
        }
      }
      return null;
    } catch (err) {
      console.warn('getReferenceLocationForUser', err);
      return null;
    }
  }

  // Render view
  async function renderMapView() {
    const content = document.getElementById('content-area');
    content.innerHTML = `
      <h2 class="text-2xl font-bold mb-4 text-gray-800">Mapa</h2>
      <div class="card p-4 mb-4">
        <div id="map-area" style="height:360px; border-radius:.5rem; overflow:hidden; background:#f3f4f6; display:flex;align-items:center;justify-content:center;">
          <div id="map-placeholder" class="text-gray-600">Cargando mapa...</div>
        </div>
        <div class="mt-3 flex gap-2">
          <button id="map-center-btn" class="p-2 rounded bg-blue-600 text-white text-sm">Centrar</button>
          <button id="map-toggle-mode" class="p-2 rounded bg-gray-100 text-sm">Forzar fallback offline</button>
          <div id="map-log" class="ml-auto text-xs text-gray-500"></div>
        </div>
      </div>
    `;
    safeCreateIcons && safeCreateIcons();

    document.getElementById('map-center-btn').addEventListener('click', async () => {
      const pos = await getCurrentPositionSafe();
      if (pos) centerOn(pos);
    });
    document.getElementById('map-toggle-mode').addEventListener('click', () => {
      // toggle simple: if mapInstance exists, destroy and show offline; otherwise try online
      if (mapInstance) {
        destroyLeaflet();
        showOfflineVisual('Modo forzado: offline');
      } else {
        initLeafletIfOnline().catch(() => showOfflineVisual('No se pudo inicializar mapa online.'));
      }
    });

    // inicializar según conexión
    if (navigator.onLine) {
      try {
        await initLeafletIfOnline();
        document.getElementById('map-log').textContent = 'Mapa: online (Leaflet + OSM)';
      } catch (e) {
        showOfflineVisual('Error inicializando Leaflet. Fallback offline activo.');
      }
    } else {
      showOfflineVisual('Sin conexión. Fallback offline activo.');
    }

    // iniciar sync periódico de posición
    startLocationSync();
  }

  function showOfflineVisual(msg) {
    const area = document.getElementById('map-area');
    const svg = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='700'><rect width='100%' height='100%' fill='#eef2ff'/><g font-family='sans-serif' fill='#3b82f6'><text x='50%' y='45%' font-size='20' text-anchor='middle'>Mapa offline</text><text x='50%' y='55%' font-size='12' text-anchor='middle' fill='#374151'>Se mostrará posición y fallback visual.</text></g></svg>`);
    area.innerHTML = `<div style="text-align:center;width:100%"><img src="data:image/svg+xml;utf8,${svg}" style="max-height:320px;display:block;margin:0 auto"/><div class="mt-2 text-sm text-gray-600">${msg}</div></div>`;
  }

  // carga Leaflet dinámicamente y crea el mapa
  function ensureLeaflet() {
    return new Promise((resolve, reject) => {
      if (leafletLoaded || window.L) { leafletLoaded = true; return resolve(); }
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(css);
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.onload = () => { leafletLoaded = true; resolve(); };
      s.onerror = () => reject(new Error('No se pudo cargar Leaflet'));
      document.body.appendChild(s);
    });
  }

  async function initLeafletIfOnline() {
    await ensureLeaflet();
    const area = document.getElementById('map-area');
    area.innerHTML = `<div id="leaflet-map" style="height:360px;width:100%"></div>`;
    const ref = await getReferenceLocationForUser();
    const center = ref ? [ref.lat, ref.lng] : [20.6597, -103.3496];
    mapInstance = L.map('leaflet-map').setView(center, 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapInstance);
    userMarker = L.marker(center).addTo(mapInstance).bindPopup('Mi ubicación').openPopup();

    // try immediate geolocation
    const pos = await getCurrentPositionSafe();
    if (pos) updatePosition(pos);
  }

  function destroyLeaflet() {
    try {
      if (mapInstance) {
        mapInstance.remove();
        mapInstance = null;
        userMarker = null;
      }
    } catch (e) {}
  }

  async function updatePosition(pos) {
    try {
      if (!pos) return;
      if (mapInstance && userMarker) {
        userMarker.setLatLng([pos.lat, pos.lng]);
        mapInstance.setView([pos.lat, pos.lng], Math.max(mapInstance.getZoom(), 15));
      } else {
        // agregar info en placeholder
        const ph = document.getElementById('map-area');
        if (ph) {
          const info = document.createElement('div');
          info.className = 'text-xs text-gray-700';
          info.style.padding = '.5rem';
          info.innerHTML = `Última posición: ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`;
          ph.appendChild(info);
        }
      }

      // comparar vs referencia (check-in)
      const ref = await getReferenceLocationForUser();
      if (!ref) return;
      const d = getDistanceMeters(pos, { lat: ref.lat, lng: ref.lng });
      const logEl = document.getElementById('map-log');
      if (logEl) logEl.textContent = `Distancia a check-in: ${Math.round(d)} m`;

      if (d > RADIUS_METERS) {
        const alertObj = {
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random(),
          timestamp: Date.now(),
          distanceMeters: d,
          lat: pos.lat,
          lng: pos.lng,
          refEntryId: ref.entryId || null,
          storeId: ref.storeId || null,
          note: `Fuera de radio ${RADIUS_METERS}m`
        };
        try {
          if (window.put) await window.put('slerts', alertObj);
          if (window.showMessage) window.showMessage('Alerta: ubicación fuera del radio.', 'error');
        } catch (e) {
          console.warn('Error guardando slert', e);
        }
      }
    } catch (e) { console.warn('updatePosition err', e); }
  }

  async function getCurrentPositionSafe() {
    try {
      if (window.getCurrentLocation) {
        const p = await window.getCurrentLocation();
        if (p && typeof p.lat === 'number' && typeof p.lng === 'number') return p;
      }
      return await new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(po => resolve({ lat: po.coords.latitude, lng: po.coords.longitude }), () => resolve(null), { enableHighAccuracy: true, timeout: 10000 });
      });
    } catch (e) { return null; }
  }

  function centerOn(pos) {
    if (!pos) return;
    if (mapInstance) mapInstance.setView([pos.lat, pos.lng], 16);
  }

  // inicia polling/watch
  function startLocationSync() {
    if (pollTimer) clearInterval(pollTimer);
    // usar watchPosition si disponible y online
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(async (p) => {
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
        await updatePosition(pos);
      }, (err) => console.warn('watchPosition err', err), { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 });
      window.__map_watch_id__ = watchId;
    }
    // fallback polling
    pollTimer = setInterval(async () => {
      const pos = await getCurrentPositionSafe();
      if (pos) await updatePosition(pos);
    }, POLL_INTERVAL_MS);
  }

  // expose
  window.renderMapView = renderMapView;
  window.startLocationSync = startLocationSync;
})();