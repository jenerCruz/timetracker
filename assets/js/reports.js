// assets/js/reports.js
(function () {
    async function loadReportData() {
        try {
            const [entries, employees, branches] = await Promise.all([
                getAll('timeEntries'),
                getAll('employees'),
                getAll('branches')
            ]);
            const employeeMap = new Map((employees || []).map(e => [e.id, e]));
            const branchMap = new Map((branches || []).map(b => [b.id, b]));
            return { entries: entries || [], employees: employees || [], branches: branches || [], employeeMap, branchMap };
        } catch (error) {
            showMessage("Error al cargar datos para reportes.", 'error');
            console.error(error);
            return { entries: [], employees: [], branches: [], employeeMap: new Map(), branchMap: new Map() };
        }
    }

    function renderReportsView(reportData) {
        const contentArea = document.getElementById('content-area');
        const { entries, employeeMap, branchMap } = reportData;

        let entryListHtml = (entries || []).slice().reverse().map(entry => {
            const employee = employeeMap.get(entry.employeeId);
            const branch = branchMap.get(entry.branchId);
            const branchName = branch ? branch.name : 'Desconocida';
            const employeeName = employee ? employee.name : `ID: ${entry.employeeId}`;

            let distanceHtml = '';
            const hasInCoords = entry.inLat != null && entry.inLng != null;
            const hasOutCoords = entry.outLat != null && entry.outLng != null;
            const hasBranchCoords = branch?.lat != null && branch?.lng != null;
            const geocercaRadio = 100;

            if (entry.clockOut && hasInCoords && hasBranchCoords) {
                const distanceIn = getDistance(entry.inLat, entry.inLng, branch.lat, branch.lng);
                const distanceOut = hasOutCoords ? getDistance(entry.outLat, entry.outLng, branch.lat, branch.lng) : 0;
                const statusClassIn = distanceIn > geocercaRadio ? 'text-red-500 font-semibold' : 'text-green-500';
                const statusClassOut = distanceOut > geocercaRadio ? 'text-red-500 font-semibold' : 'text-green-500';
                distanceHtml = `
                    <p class="text-xs text-gray-500 mt-1">
                        Ubicación (IN): <span class="${statusClassIn}">${distanceIn.toFixed(2)}m</span> |
                        Ubicación (OUT): <span class="${statusClassOut}">${hasOutCoords ? distanceOut.toFixed(2)+'m' : 'N/A'}</span>
                        (vs ${branchName})
                    </p>
                `;
            }

            return `
                <div class="card p-4 border-l-4 ${entry.clockOut ? 'border-green-400' : 'border-yellow-400'}">
                    <p class="font-bold text-gray-800">${employeeName}</p>
                    <p class="text-sm text-gray-600">IN: ${new Date(entry.clockIn).toLocaleString()}</p>
                    ${entry.clockOut ? `<p class="text-sm text-gray-600">OUT: ${new Date(entry.clockOut).toLocaleString()}</p>` : `<p class="text-sm text-yellow-600 font-semibold">Aún en turno</p>`}
                    ${distanceHtml}
                </div>
            `;
        }).join('');

        contentArea.innerHTML = `
            <h2 class="text-3xl font-bold mb-6 text-gray-800">Reportes y Estadísticas</h2>
            <div class="card p-6 mb-6 bg-blue-50 border border-blue-200">
                <h3 class="text-xl font-semibold text-blue-800 mb-2">Resumen</h3>
                <p class="text-blue-700">Total de Registros: <span class="font-bold">${entries.length}</span></p>
                <p class="text-blue-700">Total de Empleados: <span class="font-bold">${employeeMap.size}</span></p>
            </div>

            <div class="card p-6">
                <h3 class="text-xl font-semibold text-gray-800 mb-3 border-b pb-2">Historial de Registros (${entries.length})</h3>
                <div class="space-y-4">
                    ${entryListHtml || '<p class="text-gray-500">No hay registros de tiempo en la base de datos.</p>'}
                </div>
            </div>
        `;
        safeCreateIcons();
    }

    // export
    window.loadReportData = loadReportData;
    window.renderReportsView = renderReportsView;
})();