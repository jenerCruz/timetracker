// assets/js/db.js
(function () {
    if (!window.Dexie) {
        console.error("Dexie no está cargado. Asegúrate de incluir assets/js/dexie.js");
        return;
    }

    const DB_NAME = 'TimeTrackerDB';
    const DB_VERSION = 1;

    const db = new Dexie(DB_NAME);
    db.version(DB_VERSION).stores({
        branches: '++id, name, lat, lng',
        employees: '++id, name, branchId',
        timeEntries: '++id, employeeId, clockIn, branchId',
        settings: 'key' // NUEVO: Tabla para guardar configuraciones clave-valor (ej. Admin PIN)
    });

    // Exponer db globalmente
    window.appDB = db;

    // Helpers
    window.getAll = async function (storeName) {
        return (await db.table(storeName).toArray()) || [];
    };
    
    // NUEVO HELPER para obtener una configuración específica por clave
    window.getSetting = async function (key) {
        const setting = await db.table('settings').get(key);
        return setting ? setting.value : null;
    };

    // NUEVO HELPER para guardar una configuración específica por clave
    window.putSetting = async function (key, value) {
        return await db.table('settings').put({ key, value });
    };

    window.put = async function (storeName, item) {
        return await db.table(storeName).put(item);
    };

    window.bulkPut = async function (storeName, items) {
        if (!Array.isArray(items)) return;
        return await db.table(storeName).bulkPut(items);
    };

    window.remove = async function (storeName, id) {
        return await db.table(storeName).delete(parseInt(id));
    };
})();
