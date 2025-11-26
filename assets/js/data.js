// assets/js/data.js

// Usamos IIFE para aislar el scope, pero exportamos las funciones
(function (global) {
    // Las funciones de Gist que definiste previamente (ej. fetchGist, createGist, updateGist)
    
    // --- Lógica de Sincronización Gist ---
    
    async function syncWithGist(data, gistId, token, description) {
        console.log(`Sincronizando datos con Gist ID: ${gistId}`);
        // ... (tu lógica de sincronización Gist aquí, que usa fetch o un polyfill si es necesario) ...
        // Debe leer el Gist, comparar, y actualizarlo.
        
        // Simulación:
        if (!token) {
            console.warn("No hay token de GitHub, omitiendo sincronización.");
            return;
        }
        
        // Ejemplo de estructura de archivo:
        const fileContent = JSON.stringify(data, null, 2);
        const filename = 'data.json'; 

        // Enviar la actualización (requiere tu implementación de fetch/update)
        // Ejemplo simplificado:
        const url = `https://api.github.com/gists/${gistId}`;
        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                description: description,
                files: {
                    [filename]: {
                        content: fileContent
                    }
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Fallo al sincronizar Gist: ${response.statusText}`);
        }
        console.log("Sincronización Gist completada.");
    }
    
    async function exportAllToGist() {
        global.showMessage("Iniciando exportación de todos los datos...", 'info');
        // ... (Tu lógica de exportación, que llama a syncWithGist para branches, employees, y timeEntries) ...
        global.showMessage("Exportación completada. Revisa GitHub Gist.", 'success');
    }

    async function importAllFromGist() {
        global.showMessage("Iniciando importación de Gist...", 'info');
        // ... (Tu lógica de importación, que lee el Gist y usa window.put para Dexie) ...
        global.showMessage("Importación de Gist completada.", 'success');
    }

    // 3. EXPORTAR a la ventana global para que app.js pueda llamarlas
    global.syncWithGist = syncWithGist;
    global.exportAllToGist = exportAllToGist;
    global.importAllFromGist = importAllFromGist;

})(window);
