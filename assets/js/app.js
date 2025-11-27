// assets/js/app.js
(function () {
    let currentView = 'dashboard';

    function updateNavIcons(viewName) {
        document.querySelectorAll('.nav-icon').forEach(icon => {
            const iconView = icon.getAttribute('data-view');
            const button = icon.closest('button');
            if (!button) return;
            if (iconView === viewName) {
                icon.classList.add('active');
                button.classList.add('text-blue-500');
                button.classList.remove('text-gray-500');
            } else {
                icon.classList.remove('active');
                button.classList.remove('text-blue-500');
                button.classList.add('text-gray-500');
            }
        });
    }

    async function loadDashboardData() {
        const employees = await getAll('employees');
        const entries = await getAll('timeEntries');

        let totalWorkMs = 0;
        const employeeHours = {};
        const activeEmployees = [];

        (employees || []).forEach(e => { employeeHours[e.id] = 0; });

        (entries || []).forEach(entry => {
            if (entry.clockIn && entry.clockOut) {
                const duration = entry.clockOut - entry.clockIn;
                totalWorkMs += duration;
                employeeHours[entry.employeeId] = (employeeHours[entry.employeeId] || 0) + duration;
            }
            // activo si tiene clockIn reciente y no clockOut
            if (entry.clockIn && (!entry.clockOut)) {
                if (!activeEmployees.includes(entry.employeeId)) activeEmployees.push(entry.employeeId);
            }
        });

        let maxHoursMs = 0;
        const employeeStats = (employees || []).map(e => {
            const totalMs = employeeHours[e.id] || 0;
            if (totalMs > maxHoursMs) maxHoursMs = totalMs;
            return { id: e.id, name: e.name, totalMs, totalHms: msToHms(totalMs) };
        });

        return {
            totalEmployees: (employees || []).length,
            activeEmployeesCount: activeEmployees.length,
            totalTime: msToHms(totalWorkMs),
            employeeStats,
            maxHoursMs
        };
    }

    function renderDashboard(data) {
        const contentArea = document.getElementById('content-area');
        const maxBarWidth = 100;
        const barHtml = (data.employeeStats || []).sort((a, b) => b.totalMs - a.totalMs).map(stat => {
            const widthPercent = data.maxHoursMs > 0 ? (stat.totalMs / data.maxHoursMs) * maxBarWidth : 0;
            return `
                <div class="bar-container">
                    <span class="w-1/4 text-sm font-medium text-gray-700 truncate">${stat.name}:</span>
                    <div class="w-3/4 flex items-center">
                        <div class="bar flex-grow bg-blue-500 mr-2" style="width: ${widthPercent.toFixed(2)}%"></div>
                        <span class="text-xs font-semibold text-gray-600">${stat.totalHms}</span>
                    </div>
                </div>
            `;
        }).join('');

        contentArea.innerHTML = `
            <h2 class="text-3xl font-bold mb-6 text-gray-800">Dashboard</h2>
            
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div class="card p-4 bg-indigo-50 border-l-4 border-indigo-500">
                    <i data-lucide="users" class="w-6 h-6 text-indigo-500 mb-2"></i>
                    <p class="text-sm font-medium text-gray-500">Empleados Totales</p>
                    <p class="text-2xl font-bold text-gray-800">${data.totalEmployees}</p>
                </div>
                <div class="card p-4 bg-green-50 border-l-4 border-green-500">
                    <i data-lucide="check-circle" class="w-6 h-6 text-green-500 mb-2"></i>
                    <p class="text-sm font-medium text-gray-500">Empleados Activos</p>
                    <p class="text-2xl font-bold text-gray-800">${data.activeEmployeesCount}</p>
                </div>
                <div class="card p-4 bg-yellow-50 border-l-4 border-yellow-500">
                    <i data-lucide="clock-4" class="w-6 h-6 text-yellow-500 mb-2"></i>
                    <p class="text-sm font-medium text-gray-500">Total Horas Registradas</p>
                    <p class="text-2xl font-bold text-gray-800">${data.totalTime}</p>
                </div>
            </div>
            
            <div class="card p-6">
                <h3 class="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <i data-lucide="bar-chart-2" class="w-5 h-5 mr-2 text-blue-600"></i>
                    Horas Totales por Empleado
                </h3>
                
                ${data.totalEmployees === 0 
                    ? '<p class="text-gray-500">No hay empleados ni registros. ¡Comienza en Ajustes!</p>'
                    : `<div class="space-y-3">${barHtml}</div>`
                }
            </div>
        `;
        safeCreateIcons();
    }

    async function showView(viewName) {
        currentView = viewName;
        updateNavIcons(viewName);

        if (viewName === 'dashboard') {
            const data = await loadDashboardData();
            renderDashboard(data);
        } else if (viewName === 'track') {
            await renderTrackView();
        } else if (viewName === 'reports') {
            const rdata = await loadReportData();
            renderReportsView(rdata);
        } else if (viewName === 'map') { // NUEVO: Vista de Mapa
            await renderMapView(); // Llamada a la función del nuevo map.js
        } else if (viewName === 'setup') {
            await renderSetupView();
        } else {
            const data = await loadDashboardData();
            renderDashboard(data);
        }
    }

    function wireNavButtons() {
        document.getElementById('nav-dashboard').addEventListener('click', () => showView('dashboard'));
        document.getElementById('nav-track').addEventListener('click', () => showView('track'));
        document.getElementById('nav-reports').addEventListener('click', () => showView('reports'));
        // NUEVO BOTÓN DE MAPA: Asumiendo que existe en el HTML
        const navMapButton = document.getElementById('nav-map');
        if (navMapButton) {
            navMapButton.addEventListener('click', () => showView('map'));
        }
        document.getElementById('nav-setup').addEventListener('click', () => showView('setup'));
    }

    async function initApp() {
        window.showView = showView; // expose
        window.put = window.put; // already from db.js
        window.getAll = window.getAll;
        window.remove = window.remove;
        window.appDB = window.appDB;
        window.getSetting = window.getSetting;
// EXPONER
        window.putSetting = window.putSetting; 
// EXPONER

        // expose helper functions (already attached by utils)
        window.msToHms = window.msToHms;
        window.getDistance = window.getDistance;
        window.getCurrentLocation = window.getCurrentLocation;
        window.showMessage = window.showMessage;
        window.hideMessage = window.hideMessage;

        try {
            const userId = 'anon-' + (localStorage.getItem('anonId') || crypto.randomUUID());
            localStorage.setItem('anonId', userId);
            document.getElementById('user-id-display').textContent = `ID de Usuario: ${userId.substring(0, 10)}... (Local)`;
        } catch (e) {
            console.warn("crypto.randomUUID puede no estar disponible:", e);
        }

        wireNavButtons();
        
        // NUEVO: Iniciar sincronización de ubicación
        if (window.startLocationSync) {
            window.startLocationSync();
        }

        // initial view
        await showView('dashboard');
    }

// ... (El resto del código existente) ...


    function wireNavButtons() {
        document.getElementById('nav-dashboard').addEventListener('click', () => showView('dashboard'));
        document.getElementById('nav-track').addEventListener('click', () => showView('track'));
        document.getElementById('nav-reports').addEventListener('click', () => showView('reports'));
        document.getElementById('nav-setup').addEventListener('click', () => showView('setup'));
    }

    async function initApp() {
        window.showView = showView; // expose
        window.put = window.put; // already from db.js
        window.getAll = window.getAll;
        window.remove = window.remove;
        window.appDB = window.appDB;

        // expose helper functions (already attached by utils)
        window.msToHms = window.msToHms;
        window.getDistance = window.getDistance;
        window.getCurrentLocation = window.getCurrentLocation;
        window.showMessage = window.showMessage;
        window.hideMessage = window.hideMessage;

        try {
            const userId = 'anon-' + (localStorage.getItem('anonId') || crypto.randomUUID());
            localStorage.setItem('anonId', userId);
            document.getElementById('user-id-display').textContent = `ID de Usuario: ${userId.substring(0, 10)}... (Local)`;
        } catch (e) {
            console.warn("crypto.randomUUID puede no estar disponible:", e);
        }

        wireNavButtons();
        // initial view
        await showView('dashboard');
    }

    document.addEventListener('DOMContentLoaded', () => {
        safeCreateIcons();
        initApp();
    });
})();