// assets/js/setup.js
// Vista de administración protegida por PIN (admin) con env.js support y Gist export/import

(function () {
  const ADMIN_KEY = 'app_admin_hash_v1'; // donde guardamos hash del PIN
  let isAdmin = false;

  // helper: sha256 hex
  async function sha256Hex(text) {
    if (!window.crypto || !window.crypto.subtle) return btoa(text);
    const enc = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  // init from env
  (async function initFromEnv() {
    try {
      if (window.__INITIAL_ADMIN_SECRET__) {
        const h = await sha256Hex(String(window.__INITIAL_ADMIN_SECRET__));
        await putSetting('adminPinHash', h);
        try { delete window.__INITIAL_ADMIN_SECRET__; } catch (e) { window.__INITIAL_ADMIN_SECRET__ = undefined; }
      }
    } catch (e) { console.warn('initFromEnv', e); }
  })();

  async function renderSetupView() {
    const content = document.getElementById('content-area');
    const adminHash = await getSetting('adminPinHash');
    if (isAdmin) {
      await renderAdminPanel();
      return;
    }

    content.innerHTML = `
      <h2 class="text-2xl font-bold mb-4 text-gray-800">Ajustes</h2>
      <div class="card p-4 mb-4">
        <h3 class="font-semibold mb-2">Sincronización (Gist)</h3>
        <p class="text-sm text-gray-600 mb-2">Token y Gist ID deben estar en env.js (privado). Puedes usar los botones para exportar/importar.</p>
        <div class="flex gap-2">
          <button id="btn-export-gist" class="p-2 bg-indigo-600 text-white rounded">Exportar a Gist</button>
          <button id="btn-import-gist" class="p-2 bg-green-600 text-white rounded">Importar desde Gist</button>
        </div>
      </div>

      <div class="card p-4 mb-4">
        <h3 class="font-semibold mb-2">Acceso Administrador</h3>
        <p class="text-sm text-gray-600 mb-2">${adminHash ? 'Ingrese su PIN' : 'Establezca un PIN admin (mínimo 4 dígitos)'}</p>
        <form id="admin-form">
          <input id="admin-pin-input" type="password" minlength="4" placeholder="PIN administrador" class="w-full p-2 border rounded mb-2" required/>
          <button class="p-2 bg-blue-600 text-white rounded w-full" type="submit">${adminHash ? 'Acceder' : 'Guardar PIN'}</button>
        </form>
      </div>

      <div id="admin-area-placeholder"></div>
    `;
    safeCreateIcons && safeCreateIcons();
    document.getElementById('admin-form').addEventListener('submit', onAdminSubmit);
    document.getElementById('btn-export-gist').addEventListener('click', () => {
      if (window.exportAllToGist) window.exportAllToGist();
      else showMessage('Función exportAllToGist no disponible', 'error');
    });
    document.getElementById('btn-import-gist').addEventListener('click', () => {
      if (window.importAllFromGist) window.importAllFromGist();
      else showMessage('Función importAllFromGist no disponible', 'error');
    });
  }

  async function onAdminSubmit(ev) {
    ev.preventDefault();
    const v = document.getElementById('admin-pin-input').value.trim();
    if (!v || v.length < 4) { showMessage('PIN inválido', 'error'); return; }
    const storedHash = await getSetting('adminPinHash');
    const h = await sha256Hex(v);
    if (!storedHash) {
      await putSetting('adminPinHash', h);
      isAdmin = true;
      showMessage('PIN guardado. Acceso concedido.', 'success');
      await renderAdminPanel();
    } else if (h === storedHash) {
      isAdmin = true;
      showMessage('Acceso concedido.', 'success');
      await renderAdminPanel();
    } else {
      showMessage('PIN incorrecto.', 'error');
    }
  }

  // PANEL ADMIN: administrar stores y employees y ver slerts
  async function renderAdminPanel() {
    const stores = await (window.getAll ? window.getAll('stores') : []);
    const employees = await (window.getAll ? window.getAll('employees') : []);
    const slerts = await (window.getAll ? window.getAll('slerts') : []);
    const storeOptions = (stores || []).map(s => `<option value="${s.id}">${s.name}</option>`).join('');

    const storeList = (stores||[]).map(s=>`<li class="p-2 border-b flex justify-between items-center">${s.name} (${s.lat?.toFixed(4)||'N/A'}, ${s.lng?.toFixed(4)||'N/A'}) <button data-id="${s.id}" data-store="stores" class="remove-btn text-red-500">Eliminar</button></li>`).join('')||'<li>No hay stores</li>';
    const empList = (employees||[]).map(e=>`<li class="p-2 border-b flex justify-between items-center">${e.name} ${e.storeId?`(<small>${(stores.find(s=>s.id===e.storeId)||{}).name||''}</small>)`:''} <button data-id="${e.id}" data-store="employees" class="remove-btn text-red-500">Eliminar</button></li>`).join('')||'<li>No hay empleados</li>';
    const alertsHtml = (slerts||[]).sort((a,b)=>b.timestamp-a.timestamp).slice(0,50).map(a=>`<div class="p-2 border-b"><div class="text-xs text-gray-600">${new Date(a.timestamp).toLocaleString()} — ${Math.round(a.distanceMeters||0)} m — ${a.note||''}</div></div>`).join('') || '<p class="text-gray-500">Sin alertas</p>';

    const html = `
      <div class="card p-4 mb-4">
        <div class="flex justify-between items-center">
          <h3 class="font-semibold">Administración</h3>
          <div>
            <button id="btn-admin-logout" class="p-2 bg-red-500 text-white rounded">Cerrar sesión</button>
          </div>
        </div>
      </div>

      <div class="card p-4 mb-4">
        <h4 class="font-semibold mb-2">Crear Sucursal</h4>
        <form id="store-form" class="space-y-2">
          <input id="store-name" placeholder="Nombre" class="w-full p-2 border rounded" required/>
          <div class="flex gap-2">
            <input id="store-lat" placeholder="Lat" class="p-2 border rounded flex-1" required/>
            <input id="store-lng" placeholder="Lng" class="p-2 border rounded flex-1" required/>
            <button id="btn-capture-store" type="button" class="p-2 bg-indigo-600 text-white rounded">Capturar</button>
          </div>
          <button class="p-2 bg-green-600 text-white rounded">Guardar sucursal</button>
        </form>
      </div>

      <div class="card p-4 mb-4">
        <h4 class="font-semibold mb-2">Crear Empleado</h4>
        <form id="emp-form" class="space-y-2">
          <input id="emp-name" placeholder="Nombre" class="w-full p-2 border rounded" required/>
          <select id="emp-store" class="w-full p-2 border rounded">${storeOptions}</select>
          <button class="p-2 bg-green-600 text-white rounded">Guardar empleado</button>
        </form>
      </div>

      <div class="card p-4 mb-4">
        <h4 class="font-semibold">Sucursales</h4>
        <ul id="store-list" class="mt-2">${storeList}</ul>
      </div>

      <div class="card p-4 mb-4">
        <h4 class="font-semibold">Empleados</h4>
        <ul id="emp-list" class="mt-2">${empList}</ul>
      </div>

      <div class="card p-4">
        <h4 class="font-semibold">Alertas recientes</h4>
        <div id="alerts-area" class="mt-2">${alertsHtml}</div>
      </div>
    `;

    document.getElementById('admin-area-placeholder').innerHTML = html;
    safeCreateIcons && safeCreateIcons();

    document.getElementById('store-form').addEventListener('submit', async (e)=>{
      e.preventDefault();
      const name = document.getElementById('store-name').value.trim();
      const lat = parseFloat(document.getElementById('store-lat').value);
      const lng = parseFloat(document.getElementById('store-lng').value);
      if (!name || Number.isNaN(lat) || Number.isNaN(lng)) { showMessage('Datos inválidos', 'error'); return; }
      await put('stores', { id: crypto.randomUUID ? crypto.randomUUID() : Date.now()+'' , name, lat, lng, createdAt: Date.now() });
      showMessage('Sucursal guardada', 'success');
      await renderAdminPanel();
    });

    document.getElementById('btn-capture-store').addEventListener('click', async ()=>{
      const pos = await getCurrentPositionSafe();
      if (pos) {
        document.getElementById('store-lat').value = pos.lat;
        document.getElementById('store-lng').value = pos.lng;
      } else showMessage('No se pudo capturar ubicación', 'error');
    });

    document.getElementById('emp-form').addEventListener('submit', async (e)=>{
      e.preventDefault();
      const name = document.getElementById('emp-name').value.trim();
      const storeId = document.getElementById('emp-store').value || null;
      if (!name) { showMessage('Nombre requerido', 'error'); return; }
      await put('employees', { id: crypto.randomUUID ? crypto.randomUUID() : Date.now()+'', name, storeId, createdAt: Date.now() });
      showMessage('Empleado guardado', 'success');
      await renderAdminPanel();
    });

    document.getElementById('btn-admin-logout').addEventListener('click', async ()=>{
      isAdmin = false;
      showMessage('Sesión cerrada', 'info');
      await renderSetupView();
    });

    // remove buttons
    document.querySelectorAll('.remove-btn').forEach(btn=>{
      btn.addEventListener('click', async (ev)=>{
        const id = ev.currentTarget.dataset.id;
        const store = ev.currentTarget.dataset.store;
        if (!confirm('Eliminar?')) return;
        await remove(store, id);
        showMessage('Eliminado', 'success');
        await renderAdminPanel();
      });
    });

    // helper getCurrentPosition
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
  }

  // export
  window.renderSetupView = renderSetupView;
})();