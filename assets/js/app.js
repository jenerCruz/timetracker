// assets/js/app.js

(function () {
    // =========================================================================
    // CONFIGURACIÓN GLOBAL Y UTILIDADES
    // =========================================================================
    
    // userId inicializado una sola vez y de forma robusta
    const userId = 'anon-' + (localStorage.getItem('anonId') || crypto.randomUUID());
    localStorage.setItem('anonId', userId);

    let currentView = 'dashboard';
    let branchList = [];
    let employeeList = [];

    // --- Utilidades (showMessage, deg2rad, getDistance, formatHours, sleep) ---
    function showMessage(message, type = 'info') {
        const container = document.getElementById('modal-container');
        let bgColor = 'bg-blue-600';
        let icon = 'info';

        if (type === 'error') {
            bgColor = 'bg-red-600';
            icon = 'alert-triangle';
        } else if (type === 'success') {
            bgColor = 'bg-green-600';
            icon = 'check-circle';
        }

        const modalHtml = `
            <div class="card p-6 w-full max-w-sm mx-auto transform transition-all scale-100 duration-300">
                <div class="flex items-center space-x-4">
                    <i data-lucide="${icon}" class="w-6 h-6 text-white ${bgColor} rounded-full p-1 flex-shrink-0"></i>
                    <p class="text-gray-700 font-semibold flex-grow">${message}</p>
                </div>
                <div class="mt-4 text-right">
                    <button onclick="hideMessage()" class="px-4 py-2 text-sm font-medium rounded-lg text-white ${bgColor} hover:opacity-90">
                        Cerrar
                    </button>
                </div>
            </div>
        `;

        container.innerHTML = modalHtml;
        container.classList.remove('hidden');
        container.classList.add('flex');
        window.lucide.createIcons();

        setTimeout(hideMessage, 5000);
    }

    function hideMessage() {
        document.getElementById('modal-container').classList.add('hidden');
        document.getElementById('modal-container').classList.remove('flex');
    }

    function deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    function getDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    function formatHours(hours) {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}h ${m}m`;
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }


    // =========================================================================
    // LÓGICA DE VISTAS Y MANEJADORES
    // =========================================================================
    function showView(viewName) {
        currentView = viewName;
        const contentArea = document.getElementById('content-area');

        const renderResult = renderView(viewName);

        if (typeof renderResult === 'string') {
            contentArea.innerHTML = renderResult;
            window.lucide.createIcons();
        }

        if (viewName === 'setup') {
            setupFormListeners();
        }

        updateNavIcons(viewName);
    }

    function renderView(viewName) {
        switch (viewName) {
            case 'dashboard':
                return renderDashboard();
            case 'track':
                loadTrackData().then(renderTrackView).catch(console.error);
                return `<div class="text-center py-10 text-gray-500"><i data-lucide="loader-2" class="w-8 h-8 mx-auto animate-spin"></i><p class="mt-2">Preparando vista de registro...</p></div>`;
            case 'reports':
                // Nota: La función loadReportData() aún requiere implementación completa si no existe.
                // Usaremos una versión simplificada por ahora.
                loadReportData().then(renderReportsView).catch(console.error);
                return `<div class="text-center py-10 text-gray-500"><i data-lucide="loader-2" class="w-8 h-8 mx-auto animate-spin"></i><p class="mt-2">Generando reportes...</p></div>`;
            case 'setup':
                return renderSetup(branchList, employeeList);
            default:
                return renderDashboard();
        }
    }
    
    // Función de carga de datos para Track (usa window.getAll de db.js)
    async function loadTrackData() {
        try {
            const branches = await window.getAll('branches');
            const employees = await window.getAll('employees');
            branchList = branches;
            employeeList = employees;
            return { branches, employees };
        } catch (error) {
            showMessage("Error al cargar datos de Sucursales/Empleados.", 'error');
            console.error(error);
            return { branches: [], employees: [] };
        }
    }

    // Nota: La implementación de renderReportsView y loadReportData se mantiene como un placeholder.
    async function loadReportData() {
         try {
            const branches = await window.getAll('branches');
            const employees = await window.getAll('employees');
            const timeEntries = await window.getAll('timeEntries');
            return { branches, employees, timeEntries };
        } catch (error) {
            showMessage("Error al cargar datos para reportes.", 'error');
            console.error(error);
            return { branches: [], employees: [], timeEntries: [] };
        }
    }

    function renderReportsView({ branches, employees, timeEntries }) {
        const contentArea = document.getElementById('content-area');
        
        // Simplemente un placeholder para no romper la app
        contentArea.innerHTML = `
            <h2 class="text-3xl font-bold mb-6 text-gray-800">Reportes de Tiempo</h2>
            <div class="card p-6">
                <p>Implementación completa de reportes pendiente.</p>
                <p>Total de registros de tiempo: ${timeEntries.length}</p>
            </div>
        `;
        window.lucide.createIcons();
    }


    async function renderTrackView({ branches, employees }) {
        const contentArea = document.getElementById('content-area');

        if (employees.length === 0) {
            contentArea.innerHTML = `<div class="p-6 text-center card bg-yellow-100 border-yellow-400 border"><p class="font-semibold text-yellow-800">No hay empleados registrados. Por favor, agregue perfiles en la sección Ajustes.</p></div>`;
            return;
        }

        const employeeOptions = employees.map(e => `<option value="${e.id}">${e.name} (${branches.find(b => b.id === e.branchId)?.name || 'Sin Sucursal'})</option>`).join('');

        const lastEntries = await db.timeEntries.reverse().limit(5).toArray();
        const employeeMap = new Map(employees.map(e => [e.id, e.name]));

        const latestEntriesHtml = lastEntries.map(entry => {
            const status = entry.clockOut ? 'Finalizado' : 'En turno';
            const statusColor = entry.clockOut ? 'text-green-600' : 'text-yellow-600 font-semibold';
            const employeeName = employeeMap.get(entry.employeeId) || 'Desconocido';
            const timeIn = new Date(entry.clockIn).toLocaleTimeString();
            const timeOut = entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString() : 'N/A';

            return `
                <div class="card p-3 border-l-4 ${entry.clockOut ? 'border-green-400' : 'border-yellow-400'}">
                    <p class="font-bold text-gray-800">${employeeName}</p>
                    <p class="text-sm text-gray-600">IN: ${timeIn} | OUT: ${timeOut} </p>
                    <p class="text-sm ${statusColor}">${status}</p>
                </div>
            `;
        }).join('');

        contentArea.innerHTML = `
            <h2 class="text-3xl font-bold mb-6 text-gray-800">Registro de Tiempo</h2>

            <div class="card p-6 mb-6">
                <label for="employee-select" class="block text-sm font-medium text-gray-700 mb-2">Seleccionar Empleado</label>
                <select id="employee-select" class="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3">
                    ${employeeOptions}
                </select>

                <div class="mt-6 text-center">
                    <button onclick="handleClockAction('OUT')"
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
        window.lucide.createIcons();
        updateClockButtonState();
    }

    async function updateClockButtonState() {
        const $select = document.getElementById('employee-select');
        const $button = document.querySelector('.clock-button');

        if (!$select || !$button) return;

        const employeeId = parseInt($select.value);

        // Usa la instancia global de db de db.js
        const openEntry = await db.timeEntries
            .where('employeeId').equals(employeeId)
            .and(entry => entry.clockOut === null || entry.clockOut === undefined)
            .last();

        const status = openEntry ? 'IN' : 'OUT';
        const buttonText = status === 'IN' ? 'Registrar Salida (Clock Out)' : 'Registrar Entrada (Clock In)';
        const buttonColor = status === 'IN' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700';
        const buttonIcon = status === 'IN' ? 'log-out' : 'log-in';

        $button.setAttribute('onclick', `handleClockAction('${status}')`);
        $button.className = `clock-button w-full max-w-sm mx-auto text-white font-bold py-4 px-6 rounded-xl shadow-lg ${buttonColor} focus:outline-none focus:ring-4 focus:ring-opacity-50 transition duration-150 ease-in-out`;
        $button.innerHTML = `<i data-lucide="${buttonIcon}" class="w-6 h-6 inline mr-2"></i> ${buttonText}`;
        window.lucide.createIcons();

        $select.onchange = updateClockButtonState;
    }

    async function handleClockAction(status) {
        const employeeId = parseInt(document.getElementById('employee-select').value);
        const employee = employeeList.find(e => e.id === employeeId);
        const messageEl = document.getElementById('status-message');

        if (!employee) {
            showMessage("Selecciona un empleado válido.", 'error');
            return;
        }

        messageEl.textContent = 'Obteniendo ubicación... Por favor, espere.';
        messageEl.classList.remove('hidden');

        try {
            const location = await getCurrentLocation();
            messageEl.classList.add('hidden');

            if (status === 'OUT') {
                const entry = {
                    employeeId: employeeId,
                    branchId: employee.branchId,
                    clockIn: Date.now(),
                    inLat: location.lat,
                    inLng: location.lng,
                };
                await window.put('timeEntries', entry);
                showMessage(`Entrada registrada para ${employee.name}. ¡Comenzó el turno!`, 'success');
            } else {
                // Usa la instancia global de db de db.js
                const openEntry = await db.timeEntries
                    .where('employeeId').equals(employeeId)
                    .and(entry => entry.clockOut === null || entry.clockOut === undefined)
                    .last();

                if (!openEntry) {
                    showMessage("No se encontró una entrada abierta para registrar la salida.", 'error');
                    return;
                }

                openEntry.clockOut = Date.now();
                openEntry.outLat = location.lat;
                openEntry.outLng = location.lng;

                await window.put('timeEntries', openEntry);
                showMessage(`Salida registrada para ${employee.name}. Turno finalizado.`, 'success');
            }

            // Sincronizar con Gist después de registrar entrada/salida (usa window.syncWithGist de data.js)
            const gistId = localStorage.getItem('turnosGistId');
            const githubToken = localStorage.getItem('githubToken');

            if (gistId && githubToken) {
                const timeEntries = await window.getAll('timeEntries');
                await window.syncWithGist(timeEntries, gistId, githubToken, "Sincronización de turnos");
            } else {
                showMessage("Configura un Gist para sincronización en Ajustes.", 'error');
            }

            showView('track');
        } catch (error) {
            messageEl.classList.add('hidden');
            showMessage(`Error al registrar: ${error.message}`, 'error');
        }
    }

    function renderSetup(branches = [], employees = []) {
        const branchOptions = branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');

        const branchListHtml = branches.map(b => `<li class="p-2 border-b last:border-b-0 flex justify-between items-center">${b.name} (${b.lat?.toFixed(3)}, ${b.lng?.toFixed(3)}) <button onclick="removeStoreItem('branches', ${b.id})" class="text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button></li>`).join('') || '<li>No hay sucursales.</li>';
        const employeeListHtml = employees.map(e => `<li class="p-2 border-b last:border-b-0 flex justify-between items-center">${e.name} (${branches.find(b => b.id === e.branchId)?.name || 'Sin Sucursal'}) <button onclick="removeStoreItem('employees', ${e.id})" class="text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button></li>`).join('') || '<li>No hay empleados.</li>';

        return `
            <h2 class="text-3xl font-bold mb-6 text-gray-800">Ajustes</h2>

            <div class="card p-6 mb-6">
                <h3 class="text-xl font-semibold mb-4">Administrar Sucursales</h3>
                <form id="branch-form" class="space-y-4">
                    <input type="text" id="branchName" name="branchName" placeholder="Nombre de Sucursal" required class="w-full border-gray-300 rounded-lg p-2">
                    <div class="flex space-x-2">
                        <input type="number" step="any" id="branchLat" name="branchLat" placeholder="Latitud (e.g., 19.43)" required class="w-1/2 border-gray-300 rounded-lg p-2">
                        <input type="number" step="any" id="branchLng" name="branchLng" placeholder="Longitud (e.g., -99.13)" required class="w-1/2 border-gray-300 rounded-lg p-2">
                    </div>
                    <button type="submit" class="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">Guardar Sucursal</button>
                </form>

                <h3 class="text-xl font-semibold mt-8 mb-4">Administrar Empleados</h3>
                <form id="employee-form" class="space-y-4">
                    <input type="text" id="employeeName" name="employeeName" placeholder="Nombre del Empleado" required class="w-full border-gray-300 rounded-lg p-2">
                    <select id="employeeBranch" name="employeeBranch" required class="w-full border-gray-300 rounded-lg p-2">
                        <option value="">Seleccionar Sucursal...</option>
                        ${branchOptions}
                    </select>
                    <button type="submit" class="w-full bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700" ${branches.length === 0 ? 'disabled' : ''}>
                        Guardar Empleado
                    </button>
                    ${branches.length === 0 ? '<p class="text-sm text-red-500">¡Necesita al menos una Sucursal para agregar Empleados!</p>' : ''}
                </form>
            </div>

            <div class="card p-6 mb-6">
                <h3 class="text-xl font-semibold mb-4">Configuración de Sincronización con Gist</h3>
                <div class="space-y-4">
                    <div>
                        <label for="configGistId" class="block text-sm font-medium text-gray-700">Gist ID para Configuración</label>
                        <input type="text" id="configGistId" class="w-full border-gray-300 rounded-lg p-2" placeholder="ID del Gist para sucursales/empleados" value="${localStorage.getItem('configGistId') || ''}">
                    </div>
                    <div>
                        <label for="turnosGistId" class="block text-sm font-medium text-gray-700">Gist ID para Turnos</label>
                        <input type="text" id="turnosGistId" class="w-full border-gray-300 rounded-lg p-2" placeholder="ID del Gist para registros de tiempo" value="${localStorage.getItem('turnosGistId') || ''}">
                    </div>
                    <div>
                        <label for="githubToken" class="block text-sm font-medium text-gray-700">Token de GitHub</label>
                        <input type="password" id="githubToken" class="w-full border-gray-300 rounded-lg p-2" placeholder="Token de GitHub" value="${localStorage.getItem('githubToken') || ''}">
                    </div>
                    <button onclick="saveGistConfig()" class="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700">
                        Guardar Configuración
                    </button>
                </div>
            </div>

            <div class="card p-6">
                <h3 class="text-xl font-semibold mb-3">Opciones y Datos</h3>
                <button onclick="handleGistExport()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 mr-2">Exportar Gist</button>
                <button onclick="handleGistImport()" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Importar Gist</button>

                <h4 class="font-bold mt-6">Sucursales (${branches.length})</h4>
                <ul id="branch-list" class="list-none space-y-1 text-sm">${branchListHtml}</ul>
                <h4 class="font-bold mt-4">Empleados (${employees.length})</h4>
                <ul id="employee-list" class="list-none space-y-1 text-sm">${employeeListHtml}</ul>
            </div>
        `;
    }

    function saveGistConfig() {
        const configGistId = document.getElementById('configGistId').value.trim();
        const turnosGistId = document.getElementById('turnosGistId').value.trim();
        const githubToken = document.getElementById('githubToken').value.trim();

        if (configGistId) localStorage.setItem('configGistId', configGistId);
        if (turnosGistId) localStorage.setItem('turnosGistId', turnosGistId);
        if (githubToken) localStorage.setItem('githubToken', githubToken);

        showMessage("Configuración de Gist guardada.", 'success');
    }

    function setupFormListeners() {
        document.getElementById('branch-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = e.target.branchName.value.trim();
            const lat = parseFloat(e.target.branchLat.value);
            const lng = parseFloat(e.target.branchLng.value);

            if (name) {
                await window.put('branches', { name, lat, lng });
                e.target.reset();
                await refreshSetupLists();
                showMessage(`Sucursal "${name}" guardada.`, 'success');

                // Sincronizar sucursales con Gist de configuración (usa window.syncWithGist de data.js)
                const gistId = localStorage.getItem('configGistId');
                const githubToken = localStorage.getItem('githubToken');

                if (gistId && githubToken) {
                    const branches = await window.getAll('branches');
                    await window.syncWithGist(branches, gistId, githubToken, "Sincronización de sucursales");
                }
            } else {
                showMessage("El nombre de la sucursal no puede estar vacío.", 'error');
            }
        });

        document.getElementById('employee-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = e.target.employeeName.value.trim();
            const branchId = parseInt(e.target.employeeBranch.value);

            if (name && branchId) {
                await window.put('employees', { name, branchId });
                e.target.reset();
                await refreshSetupLists();
                showMessage(`Empleado "${name}" guardado.`, 'success');

                // Sincronizar empleados con Gist de configuración (usa window.syncWithGist de data.js)
                const gistId = localStorage.getItem('configGistId');
                const githubToken = localStorage.getItem('githubToken');

                if (gistId && githubToken) {
                    const employees = await window.getAll('employees');
                    await window.syncWithGist(employees, gistId, githubToken, "Sincronización de empleados");
                }
            } else {
                showMessage("Debe ingresar nombre y seleccionar una sucursal.", 'error');
            }
        });
    }

    async function refreshSetupLists() {
        try {
            branchList = await window.getAll('branches');
            employeeList = await window.getAll('employees');

            if (currentView === 'setup') {
                const contentArea = document.getElementById('content-area');
                contentArea.innerHTML = renderSetup(branchList, employeeList);
                window.lucide.createIcons();
                setupFormListeners();
            }
            return true;
        } catch (error) {
            showMessage("Error al actualizar las listas de Ajustes.", 'error');
            console.error(error);
            return false;
        }
    }

    async function removeStoreItem(storeName, id) {
        try {
            await window.remove(storeName, id);
            await refreshSetupLists();
            showMessage(`Elemento eliminado de '${storeName}'.`, 'success');

            // Sincronizar con Gist después de eliminar (usa window.syncWithGist de data.js)
            const gistId = storeName === 'branches' || storeName === 'employees'
                ? localStorage.getItem('configGistId')
                : localStorage.getItem('turnosGistId');
            const githubToken = localStorage.getItem('githubToken');

            if (gistId && githubToken) {
                const data = await window.getAll(storeName);
                const description = storeName === 'branches' ? "Sincronización de sucursales"
                    : storeName === 'employees' ? "Sincronización de empleados"
                    : "Sincronización de turnos";
                await window.syncWithGist(data, gistId, githubToken, description);
            }
        } catch (error) {
            showMessage("Error al eliminar el elemento.", 'error');
            console.error(error);
        }
    }

    async function handleGistExport() {
        showMessage("Función de Exportación a Gist no implementada completamente. Ver consola.", 'error');
        console.warn("handleGistExport fue llamado pero necesita la implementación completa de Gist.");
    }

    async function handleGistImport() {
        showMessage("Función de Importación desde Gist no implementada completamente. Ver consola.", 'error');
        console.warn("handleGistImport fue llamado pero necesita la implementación completa de Gist.");
    }

    function updateNavIcons(viewName) {
        document.querySelectorAll('.nav-icon').forEach(icon => {
            const iconView = icon.getAttribute('data-view');
            const link = icon.closest('button');

            if (!link) return;

            if (iconView === viewName) {
                link.classList.add('text-blue-500', 'font-semibold');
                link.classList.remove('text-gray-500');
            } else {
                link.classList.remove('text-blue-500', 'font-semibold');
                link.classList.add('text-gray-500');
            }
        });
    }

    function getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(position => {
                    resolve({ lat: position.coords.latitude, lng: position.coords.longitude });
                }, error => {
                    console.error("Geolocation error:", error);
                    showMessage("Error de Geolocalización. Usando 0,0.", 'error');
                    // Aunque falla, resolvemos con 0,0 para que la aplicación no se detenga.
                    resolve({ lat: 0, lng: 0 }); 
                }, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
            } else {
                console.warn("Geolocation no soportada. Usando 0,0.");
                resolve({ lat: 0, lng: 0 });
            }
        });
    }

    function renderDashboard() {
        return `<div class="p-6 text-center card"><h3 class="text-xl font-bold mb-4">Dashboard</h3><p>Vista del Dashboard cargada. Inserte datos en 'Ajustes' para comenzar.</p><p class="mt-4">Horas totales: N/A</p></div>`;
    }

    // =========================================================================
    // INICIO DE LA APLICACIÓN
    // =========================================================================
    async function initApp() {
        // Exportar funciones necesarias al scope global (window) para onclick/eventos
        window.showView = showView;
        window.handleClockAction = handleClockAction;
        window.removeStoreItem = removeStoreItem;
        window.handleGistExport = handleGistExport;
        window.handleGistImport = handleGistImport;
        window.hideMessage = hideMessage;
        window.showMessage = showMessage;
        window.updateClockButtonState = updateClockButtonState;
        window.saveGistConfig = saveGistConfig;

        try {
            document.getElementById('user-id-display').textContent = `ID de Usuario: ${userId.substring(0, 10)}... (Local)`;
            await window.initDB(); // Usa la función global de db.js
            await refreshSetupLists();
            showView('dashboard');
        } catch (error) {
            showMessage("Fallo crítico al iniciar la aplicación. Ver consola.", 'error');
            console.error("App initialization failed:", error);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        // La librería lucide.min.js ya está cargada en el <head>
        window.lucide.createIcons();
        initApp();
    });
})(); // Fin del IIFE
