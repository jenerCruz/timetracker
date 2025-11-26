// assets/js/db.js

// Usamos IIFE para aislar el scope, pero exportamos las funciones
(function (global) {
    // 1. Definición de la Base de Datos (Dexie)
    const db = new Dexie("TimeTrackerDB");
    db.version(1).stores({
        branches: '++id,name,lat,lng',
        employees: '++id,name,branchId',
        timeEntries: '++id,employeeId,branchId,clockIn,clockOut' 
    });

    // 2. Funciones CRUD que APP.JS necesita
    async function initDB() {
        // Asegura que Dexie esté listo. Se llama en app.js
        return db.open(); 
    }

    async function put(storeName, item) {
        // Usa `item.id` si existe, o deja que Dexie genere un nuevo `id`
        if (item.id) {
            return db[storeName].put(item);
        } else {
            return db[storeName].add(item);
        }
    }

    async function getAll(storeName) {
        return db[storeName].toArray();
    }

    async function remove(storeName, id) {
        return db[storeName].delete(id);
    }
    
    // 3. EXPORTAR a la ventana global para que app.js pueda llamarlas
    global.db = db; // Exporta el objeto db completo (necesario para consultas avanzadas)
    global.initDB = initDB;
    global.put = put;
    global.getAll = getAll;
    global.remove = remove;

})(window); 
