// assets/js/track.js
// Módulo para fichaje: clockIn y clockOut, guarda clockInCoords y storeId (si aplica)

(function () {
  // Renderiza la vista de registro/fichaje
  async function renderTrackView() {
    const content = document.getElementById('content-area');
    const employees = await (window.getAll ? window.getAll('employees') : []);
    const stores = await (window.getAll ? window.getAll('stores') : []);
    const employeeOptions = (employees || []).map(e => `<option value="${e.id}">${e.name}</option>`).join('');
    const storeOptions = (stores || []).map(s => `<option value="${s.id}">${s.name}</option>`).join('');

    content.innerHTML = `
      <h2 class="text-2xl font-bold mb-4 text-gray-800">Fichar</h2>
      <div class="card p-4">
        <form id="clock-form" class="space-y-3">
          <div>
            <label class="text-sm text-gray-700">Empleado</label>
            <select id="clock-employee" class="w-full p-2 border rounded" required>
              <option value="">-- Seleccionar empleado --</option>
              ${employeeOptions}
            </select>
          </div>
          <div>
            <label class="text-sm text-gray-700">Sucursal (opcional)</label>
            <select id="clock-store" class="w-full p-2 border rounded">
              <option value="">-- Seleccionar sucursal --</option>
              ${storeOptions}
            </select>
          </div>

          <div class="flex gap-2">
            <button id="btn-clock-in" class="p-2 bg-blue-600 text-white rounded flex-1">Clock In</button>
            <button id="btn-clock-out" class="p-2 bg-gray-100 rounded flex-1">Clock Out</button>
          </div>
        </form>

        <div id="recent-entries" class="mt-4 text-sm text-gray-700"></div>
      </div>
    `;
    safeCreateIcons && safeCreateIcons();

    document.getElementById('btn-clock-in').addEventListener('click', handleClockIn);
    document.getElementById('btn-clock-out').addEventListener('click', handleClockOut);

    await renderRecentEntries();
  }

  async function handleClockIn(ev) {
    ev.preventDefault();
    const empSel = document.getElementById('clock-employee');
    const storeSel = document.getElementById('clock-store');
    const employeeId = empSel.value;
    const storeId = storeSel.value || null;
    if (!employeeId) { showMessage('Selecciona un empleado', 'error'); return; }

    const pos = await getCurrentPositionSafe();
    const clockInCoords = pos ? { lat: pos.lat, lng: pos.lng } : null;

    const entry = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random(),
      employeeId,
      storeId,
      clockIn: Date.now(),
      clockInCoords
    };

    try {
      await put('timeEntries', entry);
      showMessage('Clock In registrado', 'success');
      // opcional: exponer anonId como empleadoId localmente
      localStorage.setItem('anonId', employeeId);
      await renderRecentEntries();
    } catch (e) {
      console.warn('handleClockIn err', e);
      showMessage('Error al guardar clock in', 'error');
    }
  }

  async function handleClockOut(ev) {
    ev.preventDefault();
    const empSel = document.getElementById('clock-employee');
    const employeeId = empSel.value;
    if (!employeeId) { showMessage('Selecciona un empleado', 'error'); return; }

    // buscar último entry sin clockOut
    const entries = await (window.getAll ? window.getAll('timeEntries') : []);
    const last = (entries || []).filter(e => String(e.employeeId) === String(employeeId) && !e.clockOut).sort((a,b)=> (b.clockIn||0) - (a.clockIn||0))[0];
    if (!last) { showMessage('No hay un clock-in abierto para este empleado', 'error'); return; }

    last.clockOut = Date.now();

    try {
      await put('timeEntries', last);
      showMessage('Clock Out registrado', 'success');
      await renderRecentEntries();
    } catch (e) {
      console.warn('handleClockOut err', e);
      showMessage('Error al registrar clock out', 'error');
    }
  }

  async function renderRecentEntries() {
    const entries = await (window.getAll ? window.getAll('timeEntries') : []);
    const employees = await (window.getAll ? window.getAll('employees') : []);
    const last10 = (entries || []).sort((a,b)=> (b.clockIn||0)-(a.clockIn||0)).slice(0,10);
    const html = (last10 || []).map(e => {
      const emp = employees.find(x => String(x.id) === String(e.employeeId)) || { name: 'Desconocido' };
      const inTime = e.clockIn ? new Date(e.clockIn).toLocaleString() : '-';
      const outTime = e.clockOut ? new Date(e.clockOut).toLocaleString() : '-';
      const coords = e.clockInCoords ? `${e.clockInCoords.lat.toFixed(4)},${e.clockInCoords.lng.toFixed(4)}` : 'sin coords';
      return `<div class="p-2 border-b flex justify-between items-center"><div><strong>${emp.name}</strong><div class="text-xs text-gray-500">In: ${inTime} / Out: ${outTime} / ${coords}</div></div></div>`;
    }).join('') || '<p class="text-gray-500">Sin registros recientes.</p>';
    const el = document.getElementById('recent-entries');
    if (el) el.innerHTML = html;
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

  // export
  window.renderTrackView = renderTrackView;
})();