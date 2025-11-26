// forms.js
function setupFormListeners() {
    // Formulario para agregar sucursal
    document.getElementById('branchForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('branchName').value;
        const location = document.getElementById('branchLocation').value;
        await add('branches', { name, location });
        refreshSetupLists();
        showMessage("Sucursal agregada correctamente.");
    });

    // Formulario para agregar empleado
    document.getElementById('employeeForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('employeeName').value;
        const nickname = document.getElementById('employeeNickname').value;
        const branchId = document.getElementById('employeeBranch').value;
        await add('employees', { name, nickname, branchId });
        refreshSetupLists();
        showMessage("Empleado agregado correctamente.");
    });

    // Formulario para configurar usuario
    document.getElementById('userConfigForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('userName').value;
        const nickname = document.getElementById('userNickname').value;
        const branchId = document.getElementById('userBranch').value;
        localStorage.setItem('userConfig', JSON.stringify({ name, nickname, branchId }));
        showMessage("Configuración de usuario guardada.");
    });
}

// Función para actualizar listas en la vista de configuración
async function refreshSetupLists() {
    const branches = await getAll('branches');
    const employees = await getAll('employees');
    // Aquí actualizas el DOM con las listas de sucursales y empleados
}