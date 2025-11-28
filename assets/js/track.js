// assets/js/track.js
// Vista correcta para Fichar usando la tabla BRANCHES y no STORES.
(function () {

    // =============================
    // RENDER FICHAR (TRACK VIEW)
    // =============================
    async function renderTrackView() {
        const content = document.getElementById('content-area');

        const employees = await getAll('employees');
        const branches = await getAll('branches');

        const employeeOptions = employees
            .map(e => `<option value="${e.id}">${e.name}</option>`)
            .join('');

        const branchOptions = branches
            .map(b => `<option value="${b.id}">${b.name}</option>`)
            .join('');

        content.innerHTML = `
            <h2 class="text-3xl font-bold mb-6 text-gray-800">Fichar</h2>

            <div class="card p-6 mb-6">
                <form id="clock-form" class="space-y-3">
                    
                    <div>
                        <label class="text-sm text-gray-700">Empleado</label>
                        <select id="clock-employee" class="w-full p-2 border rounded" required>
                            <option value="">-- Seleccionar empleado --</option>
                            ${employeeOptions}
                        </select>
                    </div>

                    <div>
                        <label class="text-sm text-gray-700">Sucursal</label>
                        <select id="clock-branch" class="w-full p-2 border rounded">
                            <option value="">-- Seleccionar sucursal --</option>
                            ${branchOptions}
                        </select>
                    </div>

                    <div class="flex gap-2">
                        <button id="btn-clock-in" class="p-2 bg-blue-600 text-white rounded flex-1">
                            Clock In
                        </button>
                        <button id="btn-clock-out" class="p-2 bg-gray-700 text-white rounded flex-1">
                            Clock Out
                        </button>
                    </div>
                </form>
            </div>

            <div id="recent-entries" class="card p-6">
                <h3 class="text-xl font-semibold mb-3 text-gray-700">Últimos registros</h3>
                <div id="track-log-content" class="text-sm"></div>
            </div>
        `;

        safeCreateIcons();
        wireTrackEvents();
        renderRecentEntries();
    }

    // =============================
    // EVENTOS CLOCK IN
    // =============================
    async function handleClockIn(ev) {
        ev.preventDefault();

        const employeeId = document.getElementById('clock-employee').value;
        const branchId = document.getElementById('clock-branch').value || null;

        if (!employeeId) return showMessage("Seleccione un empleado", "error");

        const loc = await getCurrentLocationSafe();

        const entry = {
            employeeId,
            branchId,
            clockIn: Date.now(),
            clockOut: null,
            clockInCoords: loc
        };

        await put('timeEntries', entry);

        showMessage("Entrada registrada", "success");
        renderRecentEntries();

        // ✅ Inicia refresco periódico de coords tras el primer Clock In
        startLocationRefresh(employeeId);
    }

    // =============================
    // EVENTOS CLOCK OUT
    // =============================
    async function handleClockOut(ev) {
        ev.preventDefault();

        const employeeId = document.getElementById('clock-employee').value;

        if (!employeeId) return showMessage("Seleccione un empleado", "error");

        const entries = await getAll('timeEntries');

        const last = entries
            .filter(e => e.employeeId == employeeId && !e.clockOut)
            .sort((a, b) => b.clockIn - a.clockIn)[0];

        if (!last) return showMessage("No hay una entrada activa", "error");

        last.clockOut = Date.now();

        await put('timeEntries', last);

        showMessage("Salida registrada", "success");
        renderRecentEntries();

        // ✅ Detiene refresco automático al hacer Clock Out
        stopLocationRefresh();
    }

    // =============================
    // LISTA DE REGISTROS
    // =============================
    async function renderRecentEntries() {
        const container = document.getElementById("track-log-content");
        const entries = await getAll("timeEntries");
        const employees = await getAll("employees");

        const list = entries
            .sort((a, b) => b.clockIn - a.clockIn)
            .slice(0, 10)
            .map(e => {
                const emp = employees.find(x => x.id == e.employeeId);
                return `
                    <div class="p-2 border-b">
                        <strong>${emp ? emp.name : "Empleado"}</strong>
                        <div class="text-xs text-gray-500">
                            In: ${e.clockIn ? new Date(e.clockIn).toLocaleString() : "-"}  
                            <br>
                            Out: ${e.clockOut ? new Date(e.clockOut).toLocaleString() : "-"}  
                            <br>
                            Coords: ${
                                e.clockInCoords
                                    ? `${e.clockInCoords.lat.toFixed(4)}, ${e.clockInCoords.lng.toFixed(4)}`
                                    : "sin coords"
                            }
                        </div>
                    </div>
                `;
            })
            .join('');

        container.innerHTML = list || "<p class='text-gray-500'>No hay registros.</p>";
    }

    // =============================
    // GEOLOCALIZACIÓN SEGURA
    // =============================
    async function getCurrentLocationSafe() {
        return new Promise(resolve => {
            navigator.geolocation.getCurrentPosition(
                pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => resolve(null),
                { enableHighAccuracy: true, timeout: 8000 }
            );
        });
    }

    // =============================
    // REFRESCO PERIÓDICO DE UBICACIÓN (cada 1 hora)
    // =============================
    let refreshTimer = null;

    function startLocationRefresh(employeeId) {
        if (refreshTimer) clearInterval(refreshTimer);

        refreshTimer = setInterval(async () => {
            const loc = await getCurrentLocationSafe();
            if (!loc) return;

            const entries = await getAll('timeEntries');
            const last = entries
                .filter(e => e.employeeId == employeeId && !e.clockOut)
                .sort((a, b) => b.clockIn - a.clockIn)[0];

            if (last) {
                last.clockInCoords = loc; // 🔄 actualiza coords
                await put('timeEntries', last);
                renderRecentEntries();
            }
        }, 60 * 60 * 1000); // cada 1 hora
    }

    function stopLocationRefresh() {
        if (refreshTimer) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }
    }

    // =============================
    // WIRE EVENTS
    // =============================
    function wireTrackEvents() {
        document.getElementById("btn-clock-in").addEventListener("click", handleClockIn);
        document.getElementById("btn-clock-out").addEventListener("click", handleClockOut);
    }

    window.renderTrackView = renderTrackView;

})();