    function renderSetup(branches = [], employees = []) {
        const branchOptions = branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');

        // CORRECCIÓN 1: Sustitución de ?. por operador ternario
        const branchListHtml = branches.map(b => `<li class="p-2 border-b last:border-b-0 flex justify-between items-center">${b.name} (${b.lat ? b.lat.toFixed(3) : 'N/A'}, ${b.lng ? b.lng.toFixed(3) : 'N/A'}) <button onclick="window.removeStoreItem('branches', ${b.id})" class="text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button></li>`).join('') || '<li>No hay sucursales.</li>';
        
        // CORRECCIÓN 2: Asegurar la obtención del nombre de la sucursal del empleado
        const employeeListHtml = employees.map(e => {
            const branch = branches.find(b => b.id === e.branchId);
            const branchName = branch ? branch.name : 'Sin Sucursal';
            return `<li class="p-2 border-b last:border-b-0 flex justify-between items-center">${e.name} (${branchName}) <button onclick="window.removeStoreItem('employees', ${e.id})" class="text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button></li>`;
        }).join('') || '<li>No hay empleados.</li>';
        

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
                    <p class="text-sm text-gray-500">Nota: El radio de geocerca se establece por defecto a 100m.</p>
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
                    <button onclick="window.saveGistConfig()" class="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700">
                        Guardar Configuración
                    </button>
                </div>
            </div>

            <div class="card p-6">
                <h3 class="text-xl font-semibold mb-3">Opciones y Datos</h3>
                <button onclick="window.handleGistExport()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 mr-2">Exportar Gist</button>
                <button onclick="window.handleGistImport()" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Importar Gist</button>

                <h4 class="font-bold mt-6">Sucursales (${branches.length})</h4>
                <ul id="branch-list" class="list-none space-y-1 text-sm">${branchListHtml}</ul>
                <h4 class="font-bold mt-4">Empleados (${employees.length})</h4>
                <ul id="employee-list" class="list-none space-y-1 text-sm">${employeeListHtml}</ul>
            </div>
        ` : `<div class="card p-6 bg-yellow-100 border-yellow-400 border"><p class="font-semibold text-yellow-800">Esta sección de Administración está restringida. Su rol actual es Empleado.</p></div>`;


        return `
            <h2 class="text-3xl font-bold mb-6 text-gray-800">Ajustes</h2>
            
            <div class="card p-6 mb-6 bg-gray-100">
                <h3 class="text-xl font-semibold mb-3">Cambiar Rol de Usuario (DEBUG)</h3>
                <select onchange="window.setUserRole(this.value)" class="w-full border-gray-300 rounded-lg p-2">
                    <option value="admin" ${userRole === 'admin' ? 'selected' : ''}>Administrador</option>
                    <option value="employee" ${userRole === 'employee' ? 'selected' : ''}>Empleado</option>
                </select>
                <p class="text-sm mt-2 text-gray-600">Rol actual: <span class="font-bold text-indigo-600">${userRole.toUpperCase()}</span></p>
            </div>
            
            ${adminFormsHtml}
        `;
    }
