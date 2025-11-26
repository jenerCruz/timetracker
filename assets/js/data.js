// assets/js/data.js

const GIST_API_BASE = 'https://api.github.com/gists';

/**
 * Sincroniza datos con un Gist de GitHub.
 * @param {object} data - Datos a sincronizar.
 * @param {string} gistId - ID del Gist (null si es nueva creación).
 * @param {string} token - Token personal de acceso de GitHub.
 * @param {string} description - Descripción del Gist.
 * @returns {Promise<object|null>} Resultado de la API o null si falla.
 */
async function syncWithGist(data, gistId, token, description = "Sincronización automática") {
    try {
        const gistData = {
            description: description,
            public: false,
            files: {
                "data.json": {
                    content: JSON.stringify(data, null, 2)
                }
            }
        };

        const url = gistId ? `${GIST_API_BASE}/${gistId}` : GIST_API_BASE;
        const method = gistId ? 'PATCH' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(gistData)
        });

        if (!response.ok) {
            throw new Error(`Error al sincronizar con Gist: ${response.statusText}`);
        }

        const result = await response.json();
        window.showMessage(`Datos sincronizados con Gist: ${result.html_url}`, 'success');
        return result;
    } catch (error) {
        window.showMessage(`Error al sincronizar con Gist: ${error.message}`, 'error');
        console.error("Error en syncWithGist:", error);
        return null;
    }
}

// Exportar funciones
window.syncWithGist = syncWithGist;
