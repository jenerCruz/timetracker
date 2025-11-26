// assets/js/setup.js
(function () {
    async function renderSetupView() {
        const branches = await getAll('branches');
        const employees = await getAll('employees');

        const branchOptions = (branches || []).map(b => `<option value="${b.id}">${b.name}</option>`).join('');

        const branchListHtml = (branches || []).map(b => 
            `<li class="p-2 border-b last:border-b-0 flex justify-between items-center">
                ${b.name} (${b.lat ? b.lat.toFixed(3) : 'N/A'}, ${b.lng ? b.lng.toFixed(3) : 'N/A'}) 
                <button data-id="${b.id}" data-store="branches" class="remove-btn text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </li>`
        ).join('') || '<li>No hay sucursales.</li>';

        const employeeListHtml = (employees || []).map(e => {
            const branch = branches.find(b => b.id === e.branchId);
            const branchName = branch ? branch.name : 'Sin Sucursal';
            return `<li class="p-2 border-b last:border-b-0 flex justify-between items-center">
                ${e.name} (${branchName}) 
                <button data-id="${e.id}" data-store="employees" class="remove-btn text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </li>`;
        }).join('') || '<li>No hay empleados.</li>';

        const savedToken = localStorage.getItem('githubToken') || '';
        const savedGistId = localStorage.getItem('gistIdConfig') || '';

        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = `
            <h2 class="text-3xl font-bold mb-6 text-gray-800">Ajustes y Administración</h2>

            <div class="card p-6 mb-6">
                <h3 class="text-xl font-semibold mb-4">Administrar Sucursales</h3>
                <form id="branch-form" class="space-y-4">
                    <input type="text" id="branchName" name="branchName" placeholder="Nombre de Sucursal" required class="w-full border-gray-300 rounded-lg p-2">
                    <div class="flex space-x-2">
                        <input type="number" step="any" id="branchLat" name="branchLat" placeholder="Latitud (e.g., 19.43)" required class="w-1/2 border-gray-300 rounded-lg p-2">
                        <input type="number" step="any" id="branchLng" name="branchLng" placeholder="Longitud (e.g., -99.13)" required class="w-1/2 border-gray-300 rounded-lg p-2">
                    </div>
                    <p class="text-sm text-gray-500">Nota: El radio de geocerca por defecto es 100m.</p>
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

            <div class="card p-6">
                <h3 class="text-xl font-semibold mb-3">Configuración de Sincronización (GitHub Gist)</h3>
                <p class="text-sm text-gray-500 mb-4">Ingrese su Token y el ID del Gist único para guardar la configuración de empleados y sucursales.</p>
                <div class="space-y-3">
                    <input type="text" id="githubToken" onchange="localStorage.setItem('githubToken', this.value)" value="${savedToken}" placeholder="Token de GitHub (Necesario para Escritura)" class="w-full border-gray-300 rounded-lg p-2">
                    <input type="text" id="gistIdConfig" onchange="localStorage.setItem('gistIdConfig', this.value)" value="${savedGistId}" placeholder="ID Gist Configuración (Ej: d5d7a8b...)" class="w-full border-gray-300 rounded-lg p-2">
                </div>
                <div class="mt-4 flex justify-between">
                    <button id="gist-export" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Exportar (Guardar)</button>
                    <button id="gist-import" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Importar (Cargar)</button>
                </div>

                <h4 class="font-bold mt-6">Sucursales (${branches.length})</h4>
                <ul id="branch-list" class="list-none space-y-1 text-sm">${branchListHtml}</ul>
                <h4 class="font-bold mt-4">Empleados (${employees.length})</h4>
                <ul id="employee-list" class="list-none space-y-1 text-sm">${employeeListHtml}</ul>
            </div>
        `;
        safeCreateIcons();

        // listeners
        document.getElementById('branch-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = e.target.branchName.value.trim();
            const lat = parseFloat(e.target.branchLat.value);
            const lng = parseFloat(e.target.branchLng.value);
            if (!name) { showMessage("El nombre de la sucursal no puede estar vacío.", 'error'); return; }
            await put('branches', { name, lat, lng });
            e.target.reset();
            showMessage(`Sucursal "${name}" guardada.`, 'success');
            await renderSetupView();
        });

        document.getElementById('employee-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = e.target.employeeName.value.trim();
            const branchId = parseInt(e.target.employeeBranch.value);
            if (!name || !branchId) { showMessage("Debe ingresar nombre y seleccionar una sucursal.", 'error'); return; }
            await put('employees', { name, branchId });
            e.target.reset(); 
            showMessage(`Empleado "${name}" guardado.`, 'success');
            await renderSetupView();
        });

        // remove buttons
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', async (ev) => {
                const id = parseInt(ev.currentTarget.dataset.id);
                const store = ev.currentTarget.dataset.store;
                if (!confirm('¿Eliminar elemento?')) return;
                await remove(store, id);
                showMessage('Elemento eliminado.', 'success');
                await renderSetupView();
            });
        });

        // gist actions (simple wrappers)
        document.getElementById('gist-export').addEventListener('click', handleGistExport);
        document.getElementById('gist-import').addEventListener('click', handleGistImport);
    }

    // export
    window.renderSetupView = renderSetupView;
})();