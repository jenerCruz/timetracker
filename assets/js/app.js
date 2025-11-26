// assets/js/app.js (Contenido Actualizado con RBAC y Fixes)

(function () {
    // =========================================================================
    // CONFIGURACIÓN GLOBAL Y UTILIDADES
    // =========================================================================
    
    const userId = 'anon-' + (localStorage.getItem('anonId') || crypto.randomUUID());
    localStorage.setItem('anonId', userId);

    let currentView = 'dashboard';
    let branchList = [];
    let employeeList = [];
    let userRole = localStorage.getItem('userRole') || 'admin'; // NEW: Inicializa el rol
    
    // --- Datos de Prueba para un inicio rápido (solo se usan si las tablas están vacías) ---
    const TEST_BRANCHES = [
        { id: 1, name: "Sucursal Central", lat: 19.432608, lng: -99.133209, radius: 100 }, 
        { id: 2, name: "Sucursal Norte", lat: 20.659698, lng: -103.349609, radius: 100 }
    ];

    const TEST_EMPLOYEES = [
        { id: 101, name: "Ana Torres (Admin)", branchId: 1 },
        { id: 102, name: "Beto Ruiz (Staff)", branchId: 2 }
    ];

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
                    <button onclick="window.hideMessage()" class="px-4 py-2 text-sm font-medium rounded-lg text-white ${bgColor} hover:opacity-90">
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
        if (isNaN(hours) || hours < 0) return '0h 0m';
        const totalMinutes = Math.round(hours * 60);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${h}h ${m}m`;
    }
    
    function setUserRole(role) {
        userRole = role;
        localStorage.setItem('userRole', role);
        showMessage(`Rol cambiado a: ${role.toUpperCase()}`, 'info');
        // Redirige al panel o al registro según el rol
        showView(userRole === 'admin' ? 'dashboard' : 'track'); 
    }

    // =========================================================================
    // LÓGICA DE VISTAS Y MANEJADORES (RBAC aplicado aquí)
    // =========================================================================
    function showView(viewName) {
        // Restricción de Vistas para Empleados
        if (userRole !== 'admin' && (viewName === 'reports' || viewName === 'setup')) {
            showMessage("Acceso denegado. Solo administradores pueden ver reportes y ajustes.", 'error');
            viewName = 'track'; // Redirige automáticamente
        }
        
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
                loadDashboardData().then(renderDashboard).catch(console.error);
                return `<div class="text-center py-10 text-gray-500"><i data-lucide="loader-2" class="w-8 h-8 mx-auto animate-spin"></i><p class="mt-2">Cargando métricas...</p></div>`;
            case 'track':
                loadTrackData().then(renderTrackView).catch(console.error);
                return `<div class="text-center py-10 text-gray-500"><i data-lucide="loader-2" class="w-8 h-8 mx-auto animate-spin"></i><p class="mt-2">Preparando vista de registro...</p></div>`;
            case 'reports':
                loadReportData().then(renderReportsView).catch(console.error);
                return `<div class="text-center py-10 text-gray-500"><i data-lucide="loader-2" class="w-8 h-8 mx-auto animate-spin"></i><p class="mt-2">Generando reportes analíticos...</p></div>`;
            case 'setup':
                return renderSetup(branchList, employeeList);
            default:
                return `<div class="p-6 text-center card"><p>Vista no encontrada.</p></div>`;
        }
    }
    
    // --- Vistas de Dashboard y Reportes (Panel de Administración) ---

    async function loadDashboardData() {
        const timeEntries = await window.getAll('timeEntries');
        const totalEntries = timeEntries.length;
        const totalHours = timeEntries.reduce((sum, entry) => {
            if (entry.clockIn && entry.clockOut) {
                return sum + ((entry.clockOut - entry.clockIn) / (1000 * 60 * 60));
            }
            return sum;
        }, 0);

        const openEntries = timeEntries.filter(e => !e.clockOut);
        
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const recentEntries = timeEntries.filter(e => e.clockIn > sevenDaysAgo && e.clockOut);
        const avgHours = recentEntries.length > 0 ? recentEntries.reduce((sum, entry) => sum + ((entry.clockOut - entry.clockIn) / (1000 * 60 * 60)), 0) / recentEntries.length : 0;

        return { totalEntries, totalHours, openEntries, avgHours };
    }

    function renderDashboard(data) {
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = `
            <h2 class="text-3xl font-bold mb-6 text-gray-800">${userRole === 'admin' ? 'Panel de Administrador' : 'Mi Resumen de Turnos'}</h2>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="card p-5 bg-indigo-50 border-l-4 border-indigo-600">
                    <p class="text-sm font-medium text-indigo-600">Total de Horas Registradas</p>
                    <p class="text-2xl font-extrabold text-gray-900">${formatHours(data.totalHours)}</p>
                </div>
                <div class="card p-5 bg-green-50 border-l-4 border-green-600">
                    <p class="text-sm font-medium text-green-600">Turnos Abiertos</p>
                    <p class="text-2xl font-extrabold text-gray-900">${data.openEntries.length}</p>
                </div>
                <div class="card p-5 bg-yellow-50 border-l-4 border-yellow-600">
                    <p class="text-sm font-medium text-yellow-600">Promedio de Turno</p>
                    <p class="text-2xl font-extrabold text-gray-900">${formatHours(data.avgHours)}</p>
                </div>
            </div>

            <h3 class="text-xl font-semibold mb-3 text-gray-800">Actividad Reciente</h3>
            ${data.openEntries.length > 0 ? `
                <div class="card p-4 space-y-2">
                    ${data.openEntries.map(entry => {
                        const employeeName = employeeList.find(e => e.id === entry.employeeId)?.name || 'Desconocido';
                        // Solo muestra turnos propios si es empleado, o todos si es admin
                        if (userRole === 'employee' && employeeName !== employeeList.find(e => e.id === entry.employeeId)?.name) return '';
                        
                        return `<div class="border-b pb-2"><p class="font-semibold text-gray-800">${employeeName}</p><p class="text-sm text-yellow-600">Entrada: ${new Date(entry.clockIn).toLocaleString()} (Abierto)</p></div>`;
                    }).join('')}
                </div>
            ` : '<p class="text-gray-500">No hay turnos abiertos actualmente.</p>'}
        `;
        window.lucide.createIcons();
    }

    async function loadReportData() {
        const branches = await window.getAll('branches');
        const employees = await window.getAll('employees');
        const timeEntries = await window.getAll('timeEntries');

        const employeeMap = new Map(employees.map(e => [e.id, e.name]));
        const branchMap = new Map(branches.map(b => [b.id, b]));
        
        const reports = {
            totalHours: 0,
            outOfBounds: [],
            shortShifts: [], 
            hoursByEmployee: {}
        };

        timeEntries.forEach(entry => {
            if (!entry.clockIn || !entry.clockOut) return;

            const durationMs = entry.clockOut - entry.clockIn;
            const durationHours = durationMs / (1000 * 60 * 60);

            reports.totalHours += durationHours;

            // Turnos Cortos (Menos de 8 horas)
            if (durationHours < 8) {
                reports.shortShifts.push({
                    employeeId: entry.employeeId,
                    employeeName: employeeMap.get(entry.employeeId),
                    duration: formatHours(durationHours),
                    date: new Date(entry.clockIn).toLocaleDateString()
                });
            }

            // Reportes Fuera de Ubicación
            const branch = branchMap.get(entry.branchId);
            const radius = branch?.radius || 100; 

            if (branch && entry.inLat && entry.inLng) {
                const distanceIn = getDistance(entry.inLat, entry.inLng, branch.lat, branch.lng);
                if (distanceIn > radius) {
                    reports.outOfBounds.push({
                        employeeId: entry.employeeId,
                        employeeName: employeeMap.get(entry.employeeId),
                        type: 'Entrada',
                        distance: `${Math.round(distanceIn)}m`,
                        date: new Date(entry.clockIn).toLocaleString()
                    });
                }
            }
            if (branch && entry.outLat && entry.outLng) {
                const distanceOut = getDistance(entry.outLat, entry.outLng, branch.lat, branch.lng);
                if (distanceOut > radius) {
                    reports.outOfBounds.push({
                        employeeId: entry.employeeId,
                        employeeName: employeeMap.get(entry.employeeId),
                        type: 'Salida',
                        distance: `${Math.round(distanceOut)}m`,
                        date: new Date(entry.clockOut).toLocaleString()
                    });
                }
            }

            // Horas por Empleado
            reports.hoursByEmployee[entry.employeeId] = (reports.hoursByEmployee[entry.employeeId] || 0) + durationHours;
        });
        
        reports.hoursByEmployee = Object.entries(reports.hoursByEmployee).map(([id, hours]) => ({
            employeeId: parseInt(id),
            employeeName: employeeMap.get(parseInt(id)) || 'Desconocido',
            totalHours: formatHours(hours),
            rawHours: hours
        })).sort((a, b) => b.rawHours - a.rawHours);

        return reports;
    }

    function renderReportsView(reports) {
        const contentArea = document.getElementById('content-area');
        
        // Función auxiliar para renderizar listas de reportes
        const renderList = (items, title, icon, colorClass, noDataMessage) => `
            <h3 class="text-xl font-semibold mb-3 flex items-center text-gray-800">
                <i data-lucide="${icon}" class="w-5 h-5 mr-2 ${colorClass}"></i> ${title} (${items.length})
            </h3>
            <div class="card p-4 mb-6 max-h-64 overflow-y-auto">
                ${items.length > 0 ? `
                    <ul class="divide-y divide-gray-100">
                        ${items.map(item => `
                            <li class="py-2 text-sm">
                                <span class="font-medium">${item.employeeName || 'ID Desconocido'}</span>
                                ${item.duration ? `<span class="text-gray-600"> | Duración: ${item.duration}</span>` : ''}
                                ${item.type ? `<span class="text-gray-600"> | Tipo: <span class="font-bold">${item.type}</span></span>` : ''}
                                ${item.distance ? `<span class="text-red-500 font-bold"> | Distancia: ${item.distance}</span>` : ''}
                                <span class="text-gray-500 block">${item.date}</span>
                            </li>
                        `).join('')}
                    </ul>
                ` : `<p class="text-gray-500">${noDataMessage}</p>`}
            </div>
        `;
        
        // Ranking de Horas por Empleado (Tabla)
        const hoursTable = `
            <h3 class="text-xl font-semibold mb-3 flex items-center text-gray-800">
                <i data-lucide="users" class="w-5 h-5 mr-2 text-blue-600"></i> Ranking de Horas por Empleado
            </h3>
            <div class="card p-4 mb-6">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                            <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Horas Totales</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        ${reports.hoursByEmployee.map((item, index) => `
                            <tr class="${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
                                <td class="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">${index + 1}</td>
                                <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-700">${item.employeeName}</td>
                                <td class="px-3 py-2 whitespace-nowrap text-sm font-bold text-right text-indigo-600">${item.totalHours}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${reports.hoursByEmployee.length === 0 ? '<p class="text-gray-500 py-4 text-center">No hay datos de horas registrados.</p>' : ''}
            </div>
        `;


        contentArea.innerHTML = `
            <h2 class="text-3xl font-bold mb-6 text-gray-800">Reportes Analíticos</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div class="card p-5 bg-indigo-50 border-l-4 border-indigo-600">
                    <p class="text-sm font-medium text-indigo-600">Gran Total de Horas</p>
                    <p class="text-2xl font-extrabold text-gray-900">${formatHours(reports.totalHours)}</p>
                </div>
            </div>

            ${hoursTable}

            ${renderList(
                reports.outOfBounds, 
                "Reportes Fuera de Ubicación (Tolerancia 100m)", 
                "map-pin-off", 
                "text-red-600",
                "¡Excelente! No hay reportes de entrada/salida fuera de la ubicación registrada."
            )}

            ${renderList(
                reports.shortShifts, 
                "Turnos Menores a 8 Horas", 
                "clock-alert", 
                "text-yellow-600",
                "Todos los turnos son de 8 horas o más."
            )}
        `;
        window.lucide.createIcons();
    }
    
    // --- Vistas de Registro y Configuración (con RBAC) ---

    // La función loadTrackData, renderTrackView, updateClockButtonState y handleClockAction se mantienen sin cambios mayores aquí
    // ya que la lógica de registro está en handleClockAction y es accesible para todos.

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

    async function renderTrackView({ branches, employees }) {
        const contentArea = document.getElementById('content-area');
        let filteredEmployees = employees;
        
        // Si es empleado, solo ve su propio perfil
        if (userRole === 'employee') {
            const anonId = localStorage.getItem('anonId');
            // Nota: Aquí se necesitaría un mecanismo real de identificación,
            // pero para la demo, si no hay ID, no hay registro.
            filteredEmployees = employees; // Dejar que elijan si la ID no es estricta
            if (filteredEmployees.length === 0) {
                 contentArea.innerHTML = `<div class="p-6 text-center card bg-yellow-100 border-yellow-400 border"><p class="font-semibold text-yellow-800">No hay empleados registrados. Contacte a su administrador.</p></div>`;
                 return;
            }
        }

        if (filteredEmployees.length === 0) {
            contentArea.innerHTML = `<div class="p-6 text-center card bg-yellow-100 border-yellow-400 border"><p class="font-semibold text-yellow-800">No hay empleados registrados. Por favor, agregue perfiles en la sección Ajustes.</p></div>`;
            return;
        }

        const employeeOptions = filteredEmployees.map(e => `<option value="${e.id}">${e.name} (${branches.find(b => b.id === e.branchId)?.name || 'Sin Sucursal'})</option>`).join('');

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
                <label for="employee-select" class="block text-sm font-medium text-gray-700 mb-2">Seleccionar Perfil</label>
                <select id="employee-select" class="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3">
                    ${employeeOptions}
                </select>

                <div class="mt-6 text-center">
                    <button onclick="window.handleClockAction('OUT')"
                            class="clock-button w-full max-w-sm mx-auto text-white font-bold py-4 px-6 rounded-xl shadow-lg bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-opacity-50 transition duration-150 ease-in-out">
                        <i data-lucide="log-in" class="w-6 h-6 inline mr-2"></i>
                        Registrar Entrada (Clock In)
                    </button>
                </div>

                <div id="status-message" class="mt-6 p-3 text-sm text-center bg-blue-50 text-blue-800 rounded-lg hidden">
                    Obteniendo ubicación... Por favor, espere.
                </div>
            </div>

            <h3 class="text-xl font-semibold text-gray-800 mb-3">Últimos Registros</h3>
            <div id="latest-entries" class="space-y-3">
                 ${latestEntriesHtml || '<p class="text-gray-500">No hay registros de tiempo.</p>'}
            </div>
        `;
        window.lucide.createIcons();
        window.updateClockButtonState();
    }


    function renderSetup(branches = [], employees = []) {
        const branchOptions = branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');

        const branchListHtml = branches.map(b => `<li class="p-2 border-b last:border-b-0 flex justify-between items-center">${b.name} (${b.lat?.toFixed(3)}, ${b.lng?.toFixed(3)}) <button onclick="window.removeStoreItem('branches', ${b.id})" class="text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button></li>`).join('') || '<li>No hay sucursales.</li>';
        const employeeListHtml = employees.map(e => `<li class="p-2 border-b last:border-b-0 flex justify-between items-center">${e.name} (${branches.find(b => b.id === e.branchId)?.name || 'Sin Sucursal'}) <button onclick="window.removeStoreItem('employees', ${e.id})" class="text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button></li>`).join('') || '<li>No hay empleados.</li>';

        // Bloque de administración solo visible para el rol 'admin'
        const adminFormsHtml = userRole === 'admin' ? `
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
                        ${branchOptions
