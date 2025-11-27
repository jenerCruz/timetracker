// assets/js/setup.js
(function () {
    // Variable de estado de sesión de administrador temporal (solo dura mientras la app esté abierta)
    let isAdminAuthenticated = false;

    // Función que carga la vista de CONFIGURACIÓN (GATE)
    async function renderSetupView() {
        const contentArea = document.getElementById('content-area');
        const adminPin = await getSetting('adminPin'); // Obtiene el PIN guardado
        
        // Si ya está autenticado, vamos directo a la vista de administración
        if (isAdminAuthenticated) {
            await renderAdminView();
            return;
        }

        // --- VISTA DE ACCESO DE ADMINISTRADOR (GATE) ---

        const pinMessage = adminPin 
            ? 'Ingrese el PIN de Administrador para acceder a la gestión de empleados y sucursales.'
            : 'Establezca un PIN de Administrador (mínimo 4 dígitos) para proteger las funciones de gestión.';
        
        const buttonText = adminPin ? 'Acceder' : 'Guardar PIN y Acceder';

        contentArea.innerHTML = `
            <h2 class="text-3xl font-bold mb-6 text-gray-800">Ajustes y Configuración</h2>

            <div class="card p-6 mb-6">
                <h3 class="text-xl font-semibold mb-3">Configuración de Sincronización (GitHub Gist)</h3>
                <p class="text-sm text-gray-500 mb-4">Ingrese su Token y el ID del Gist único para la configuración de empleados/sucursales.</p>
                <div class="space-y-3">
                    <input type="text" id="githubToken" onchange="localStorage.setItem('githubToken', this.value)" value="${localStorage.getItem('githubToken') || ''}" placeholder="Token de GitHub (Necesario para Escritura)" class="w-full border-gray-300 rounded-lg p-2">
                    <input type="text" id="gistIdConfig" onchange="localStorage.setItem('gistIdConfig', this.value)" value="${localStorage.getItem('gistIdConfig') || ''}" placeholder="ID Gist Configuración (Ej: d5d7a8b...)" class="w-full border-gray-300 rounded-lg p-2">
                </div>
                <div class="mt-4 flex justify-between">
                    <button id="gist-export" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Exportar (Guardar)</button>
                    <button id="gist-import" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Importar (Cargar)</button>
                </div>
            </div>
            
            <div class="card p-6 mb-6 bg-red-50 border-l-4 border-red-500">
                <h3 class="text-xl font-semibold mb-4 text-red-800">Acceso de Administración</h3>
                <p class="text-sm text-gray-700 mb-4">${pinMessage}</p>
                <form id="admin-pin-form" class="space-y-4">
                    <input type="password" id="adminPinInput" name="adminPinInput" placeholder="Ingrese PIN/Contraseña" required minlength="4" class="w-full border-gray-300 rounded-lg p-2 text-center text-lg tracking-wider">
                    <button type="submit" class="w-full bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700">${buttonText}</button>
                </form>
            </div>
            
            <div id="admin-management-area">
                </div>
        `;
        safeCreateIcons();
        wireGistListeners();

        document.getElementById('admin-pin-form').addEventListener('submit', handleAdminPin);
        
        // Muestra las listas de solo lectura por defecto
        renderEmployeeBranchLists(await getAll('branches'), await getAll('employees'));
    }

    // Función para manejar la autenticación del PIN
    async function handleAdminPin(e) {
        e.preventDefault();
        const inputPin = e.target.adminPinInput.value.trim();
        const storedPin = await getSetting('adminPin');

        if (!storedPin) {
            // Caso 1: Establecer PIN por primera vez
            if (inputPin.length < 4) {
                showMessage('El PIN debe tener al menos 4 caracteres.', 'error');
                return;
            }
            await putSetting('adminPin', inputPin);
            isAdminAuthenticated = true;
            showMessage('PIN de Administrador establecido y acceso concedido.', 'success');
            await renderSetupView(); // Recarga para mostrar la vista de gestión
        } else if (inputPin === storedPin) {
            // Caso 2: PIN correcto
            isAdminAuthenticated = true;
            showMessage('Acceso de Administrador concedido.', 'success');
            await renderAdminView(); // Muestra la vista de gestión
        } else {
            // Caso 3: PIN incorrecto
            showMessage('PIN incorrecto. Inténtelo de nuevo.', 'error');
            isAdminAuthenticated = false;
        }
    }

    // Función que renderiza la VISTA DE ADMINISTRACIÓN (PROTEGIDA)
    async function renderAdminView() {
        const branches = await getAll('branches');
        const employees = await getAll('employees');
        const contentArea = document.getElementById('admin-management-area');
        
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

        // Contenido Administrativo: Formularios y Listas con botones de eliminación
        contentArea.innerHTML = `
            <div class="card p-6 mb-6 bg-green-100 border-l-4 border-green-500">
                 <p class="text-sm font-bold text-green-800">ACCESO ADMINISTRATIVO ACTIVO</p>
                 <button id="admin-logout" class="mt-2 text-xs bg-red-500 text-white px-2 py-1 rounded-lg hover:bg-red-600">Cerrar Sesión Admin</button>
            </div>
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
            
            <div class="card p-6 mt-6">
                <h4 class="font-bold">Sucursales (${branches.length})</h4>
                <ul id="branch-list" class="list-none space-y-1 text-sm">${branchListHtml}</ul>
                <h4 class="font-bold mt-4">Empleados (${employees.length})</h4>
                <ul id="employee-list" class="list-none space-y-1 text-sm">${employeeListHtml}</ul>
            </div>
        `;

        safeCreateIcons();
        wireAdminListeners();
    }

    // Función para renderizar ÚNICAMENTE las listas de empleados/sucursales (solo lectura)
    function renderEmployeeBranchLists(branches, employees) {
        const branchListHtml = (branches || []).map(b => 
            `<li class="p-2 border-b last:border-b-0 flex justify-between items-center">
                ${b.name} (${b.lat ? b.lat.toFixed(3) : 'N/A'}, ${b.lng ? b.lng.toFixed(3) : 'N/A'}) 
            </li>`
        ).join('') || '<li>No hay sucursales.</li>';

        const employeeListHtml = (employees || []).map(e => {
            const branch = branches.find(b => b.id === e.branchId);
            const branchName = branch ? branch.name : 'Sin Sucursal';
            return `<li class="p-2 border-b last:border-b-0 flex justify-between items-center">
                ${e.name} (${branchName}) 
            </li>`;
        }).join('') || '<li>No hay empleados.</li>';
        
        // Carga la información en el área de gestión (debajo del gate)
        document.getElementById('admin-management-area').innerHTML = `
            <div class="card p-6 mt-6">
                <h4 class="font-bold">Sucursales Registradas (${branches.length}) (Solo Lectura)</h4>
                <ul id="branch-list" class="list-none space-y-1 text-sm">${branchListHtml}</ul>
                <h4 class="font-bold mt-4">Empleados Registrados (${employees.length}) (Solo Lectura)</h4>
                <ul id="employee-list" class="list-none space-y-1 text-sm">${employeeListHtml}</ul>
            </div>
        `;
    }

    // Funciones de manejo de eventos administrativas
    function wireAdminListeners() {
        document.getElementById('branch-form').addEventListener('submit', handleBranchForm);
        document.getElementById('employee-form').addEventListener('submit', handleEmployeeForm);
        document.getElementById('admin-logout').addEventListener('click', handleAdminLogout);

        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', handleRemoveItem);
        });
    }

    async function handleAdminLogout() {
        isAdminAuthenticated = false;
        showMessage('Sesión de Administrador cerrada.', 'info');
        await renderSetupView();
    }
    
    async function handleBranchForm(e) {
        e.preventDefault();
        const name = e.target.branchName.value.trim();
        const lat = parseFloat(e.target.branchLat.value);
        const lng = parseFloat(e.target.branchLng.value);
        if (!name) { showMessage("El nombre de la sucursal no puede estar vacío.", 'error'); return; }
        await put('branches', { name, lat, lng });
        e.target.reset();
        showMessage(`Sucursal "${name}" guardada.`, 'success');
        await renderAdminView();
    }
    
    async function handleEmployeeForm(e) {
        e.preventDefault();
        const name = e.target.employeeName.value.trim();
        const branchId = parseInt(e.target.employeeBranch.value);
        if (!name || !branchId) { showMessage("Debe ingresar nombre y seleccionar una sucursal.", 'error'); return; }
        await put('employees', { name, branchId });
        e.target.reset(); 
        showMessage(`Empleado "${name}" guardado.`, 'success');
        await renderAdminView();
    }
    
    async function handleRemoveItem(ev) {
        const id = parseInt(ev.currentTarget.dataset.id);
        const store = ev.currentTarget.dataset.store;
        if (!confirm('¿Eliminar elemento? Esta acción es irreversible.')) return;
        await remove(store, id);
        showMessage('Elemento eliminado.', 'success');
        await renderAdminView();
    }
    
    // Funciones de Gist (mantienen el funcionamiento original)
    function wireGistListeners() {
        document.getElementById('gist-export').addEventListener('click', handleGistExport);
        document.getElementById('gist-import').addEventListener('click', handleGistImport);
    }

    window.renderSetupView = renderSetupView;
})();
