// assets/js/track.js
(function () {
    // Dependencias: appDB, getAll, put, getCurrentLocation, getDistance, showMessage, hideMessage, safeCreateIcons
    async function renderTrackView() {
        const contentArea = document.getElementById('content-area');
        const branches = await getAll('branches');
        const employees = await getAll('employees');

        // Ultimos entries
        const lastEntries = await appDB.timeEntries.orderBy('id').reverse().limit(8).toArray();

        const employeeMap = new Map((employees || []).map(e => [e.id, e.name]));
        const employeeOptions = (employees || []).map(e => `<option value="${e.id}">${e.name} (${branches.find(b => b.id === e.branchId)?.name || 'Sin Sucursal'})</option>`).join('');

        const latestEntriesHtml = (lastEntries || []).map(entry => {
            const status = entry.clockOut ? 'Finalizado' : 'En turno';
            const statusColor = entry.clockOut ? 'text-green-600' : 'text-yellow-600 font-semibold';
            const employeeName = employeeMap.get(entry.employeeId) || 'Desconocido';
            const timeIn = new Date(entry.clockIn).toLocaleTimeString();
            const timeOut = entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString() : 'N/A';
            return `
                <div class="card p-3 border-l-4 ${entry.clockOut ? 'border-green-400' : 'border-yellow-400'}">
                    <p class="font-bold text-gray-800">${employeeName}</p>
                    <p class="text-sm text-gray-600">IN: ${timeIn} | OUT: ${timeOut}</p>
                    <p class="text-sm ${statusColor}">${status}</p>
                </div>
            `;
        }).join('');

        contentArea.innerHTML = `
            <h2 class="text-3xl font-bold mb-6 text-gray-800">Registro de Tiempo</h2>
            <div class="card p-6 mb-6">
                <label for="employee-select" class="block text-sm font-medium text-gray-700 mb-2">Seleccionar Empleado</label>
                <select id="employee-select" class="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3">
                    <option value="">-- Selecciona --</option>
                    ${employeeOptions}
                </select>

                <div class="mt-6 text-center">
                    <button id="main-clock-btn"
                            class="clock-button w-full max-w-sm mx-auto text-white font-bold py-4 px-6 rounded-xl shadow-lg bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-opacity-50 transition duration-150 ease-in-out">
                        <i data-lucide="log-in" class="w-6 h-6 inline mr-2"></i>
                        Registrar Entrada (Clock In)
                    </button>
                </div>

                <div id="status-message" class="mt-6 p-3 text-sm text-center bg-blue-50 text-blue-800 rounded-lg hidden">
                    Obteniendo ubicación... Por favor, espere.
                </div>
            </div>

            <h3 class="text-xl font-semibold text-gray-800 mb-3">Últimos Registros (Globales)</h3>
            <div id="latest-entries" class="space-y-3">
                 ${latestEntriesHtml || '<p class="text-gray-500">No hay registros de tiempo.</p>'}
            </div>
        `;
        safeCreateIcons();
        document.getElementById('employee-select').addEventListener('change', updateClockButtonState);
        document.getElementById('main-clock-btn').addEventListener('click', () => {
            // accion depende del estado actual (IN o OUT)
            const curr = document.getElementById('main-clock-btn').getAttribute('data-action') || 'IN';
            handleClockAction(curr);
        });
        await updateClockButtonState();
    }

    async function updateClockButtonState() {
        const $select = document.getElementById('employee-select');
        const $button = document.getElementById('main-clock-btn');
        if (!$select || !$button) return;

        const employeeId = parseInt($select.value);
        if (isNaN(employeeId)) {
            $button.setAttribute('data-action', 'OUT');
            $button.innerHTML = `<i data-lucide="log-in" class="w-6 h-6 inline mr-2"></i> Registrar Entrada (Clock In)`;
            safeCreateIcons();
            return;
        }

        let openEntry = null;
        try {
            openEntry = await appDB.timeEntries
                .where('employeeId').equals(employeeId)
                .and(e => e.clockOut === null || e.clockOut === undefined)
                .last();
        } catch (e) {
            // posible que no exista
            openEntry = null;
        }

        const status = openEntry ? 'IN' : 'OUT';
        const buttonText = status === 'IN' ? 'Registrar Salida (Clock Out)' : 'Registrar Entrada (Clock In)';
        const buttonColor = status === 'IN' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700';
        const buttonIcon = status === 'IN' ? 'log-out' : 'log-in';

        $button.setAttribute('data-action', status === 'IN' ? 'OUT' : 'IN'); // action to perform if clicked
        $button.className = `clock-button w-full max-w-sm mx-auto text-white font-bold py-4 px-6 rounded-xl shadow-lg ${buttonColor} focus:outline-none focus:ring-4 focus:ring-opacity-50 transition duration-150 ease-in-out`;
        $button.innerHTML = `<i data-lucide="${buttonIcon}" class="w-6 h-6 inline mr-2"></i> ${buttonText}`;
        safeCreateIcons();
    }

    async function handleClockAction(requestedAction) {
        // requestedAction: 'IN' (means we should create an entry) or 'OUT' (means close)
        const select = document.getElementById('employee-select');
        const statusEl = document.getElementById('status-message');
        const employeeId = parseInt(select.value);
        if (isNaN(employeeId)) { showMessage('Empleado no seleccionado.', 'error'); return; }
        const employee = (await getAll('employees')).find(e => e.id === employeeId);
        if (!employee) { showMessage('Empleado no encontrado.', 'error'); return; }

        statusEl.textContent = 'Obteniendo ubicación... Por favor, espere.';
        statusEl.classList.remove('hidden');

        try {
            const location = await getCurrentLocation();
            statusEl.classList.add('hidden');

            if (requestedAction === 'IN') {
                // create entry
                const entry = {
                    employeeId: employeeId,
                    branchId: employee.branchId || null,
                    clockIn: Date.now(),
                    inLat: location.lat,
                    inLng: location.lng,
                    clockOut: null
                };
                await put('timeEntries', entry);
                showMessage(`Entrada registrada para ${employee.name}.`, 'success');
            } else {
                // find open entry
                const openEntry = await appDB.timeEntries
                    .where('employeeId').equals(employeeId)
                    .and(e => e.clockOut === null || e.clockOut === undefined)
                    .last();

                if (!openEntry) {
                    showMessage('No se encontró una entrada abierta para este empleado.', 'error');
                    return;
                }

                openEntry.clockOut = Date.now();
                openEntry.outLat = location.lat;
                openEntry.outLng = location.lng;
                await put('timeEntries', openEntry);
                showMessage(`Salida registrada para ${employee.name}.`, 'success');
            }

            // actualizar vista
            await renderTrackView();
        } catch (error) {
            statusEl.classList.add('hidden');
            console.error(error);
            showMessage(`Error al registrar: ${error?.message || error}`, 'error');
        }
    }

    // export functions to global so app.js can call them
    window.renderTrackView = renderTrackView;
    window.updateClockButtonState = updateClockButtonState;
    window.handleClockAction = handleClockAction;
})();