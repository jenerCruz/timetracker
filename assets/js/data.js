// data.js
let gistConfig = {
    gistId: '',
    token: ''
};

// Función para cargar datos de asistencia
async function loadReportData() {
    try {
        const attendanceData = await getAll('attendance');
        return attendanceData;
    } catch (error) {
        console.error("Error al cargar datos de asistencia:", error);
        return [];
    }
}

// Función para cargar datos de seguimiento
async function loadTrackData() {
    try {
        const trackData = await getAll('attendance');
        return trackData;
    } catch (error) {
        console.error("Error al cargar datos de seguimiento:", error);
        return [];
    }
}

// Función para sincronizar con GitHub Gist
async function syncWithGist() {
    if (!gistConfig.gistId || !gistConfig.token) {
        showMessage("Configura primero el ID del Gist y el token de GitHub.");
        return;
    }

    try {
        const data = {
            branches: await getAll('branches'),
            employees: await getAll('employees'),
            attendance: await getAll('attendance')
        };

        const response = await fetch(`https://api.github.com/gists/${gistConfig.gistId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${gistConfig.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: {
                    'asistencias.json': {
                        content: JSON.stringify(data, null, 2)
                    }
                }
            })
        });

        if (response.ok) {
            showMessage("Datos sincronizados correctamente con GitHub Gist.");
        } else {
            showMessage("Error al sincronizar con GitHub Gist.");
        }
    } catch (error) {
        console.error("Error al sincronizar con GitHub Gist:", error);
        showMessage("Error al sincronizar con GitHub Gist.");
    }
}

// Función para manejar la exportación a GitHub Gist
function handleGistExport() {
    const gistId = prompt("Ingresa el ID del Gist:");
    const token = prompt("Ingresa tu token de GitHub:");
    if (gistId && token) {
        gistConfig = { gistId, token };
        syncWithGist();
    }
}

// Función para manejar la importación desde GitHub Gist
async function handleGistImport() {
    const gistId = prompt("Ingresa el ID del Gist:");
    const token = prompt("Ingresa tu token de GitHub:");
    if (gistId && token) {
        try {
            const response = await fetch(`https://api.github.com/gists/${gistId}`, {
                headers: {
                    'Authorization': `token ${token}`
                }
            });
            const gist = await response.json();
            const data = JSON.parse(gist.files['asistencias.json'].content);

            // Limpiar stores antes de importar
            await clearStore('branches');
            await clearStore('employees');
            await clearStore('attendance');

            // Importar datos
            for (const branch of data.branches) {
                await add('branches', branch);
            }
            for (const employee of data.employees) {
                await add('employees', employee);
            }
            for (const record of data.attendance) {
                await add('attendance', record);
            }

            showMessage("Datos importados correctamente desde GitHub Gist.");
        } catch (error) {
            console.error("Error al importar datos desde GitHub Gist:", error);
            showMessage("Error al importar datos desde GitHub Gist.");
        }
    }
}

// Función para guardar la configuración del Gist
function saveGistConfig() {
    const gistId = prompt("Ingresa el ID del Gist:");
    const token = prompt("Ingresa tu token de GitHub:");
    if (gistId && token) {
        gistConfig = { gistId, token };
        localStorage.setItem('gistConfig', JSON.stringify(gistConfig));
        showMessage("Configuración del Gist guardada.");
    }
}