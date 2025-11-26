// assets/js/db.js

// Definiciones globales de la DB
const DB_NAME = 'TimeTrackerDB';
const DB_VERSION = 1;

let db;

/**
 * Inicializa y abre la base de datos Dexie.
 * @returns {Promise<Dexie>} La instancia de la base de datos.
 */
function initDB() {
    return new Promise((resolve, reject) => {
        try {
            db = new Dexie(DB_NAME);
            db.version(DB_VERSION).stores({
                branches: '++id, name',
                employees: '++id, branchId',
                timeEntries: '++id, employeeId, clockIn'
            });

            db.version(2).upgrade(tx => {
                console.log("Dexie: Base de datos v2 preparada para futuras migraciones.");
            });

            db.open()
                .then(() => {
                    console.log("Dexie DB abierta y lista.");
                    resolve(db);
                })
                .catch(err => {
                    console.error("Error al abrir Dexie:", err);
                    window.showMessage(`Error de base de datos: ${err.message}`, 'error');
                    reject(err);
                });
        } catch (e) {
            reject(e);
        }
    });
}

/**
 * Obtiene todos los elementos de un almacén (store).
 * @param {string} storeName - Nombre del almacén.
 * @returns {Promise<Array>} Lista de elementos.
 */
async function getAll(storeName) {
    if (!db) await initDB();
    return db.table(storeName).toArray();
}

/**
 * Añade o actualiza un elemento en un almacén.
 * @param {string} storeName - Nombre del almacén.
 * @param {object} item - Elemento a guardar.
 * @returns {Promise<any>} Clave generada o actualizada.
 */
async function put(storeName, item) {
    if (!db) await initDB();
    return db.table(storeName).put(item);
}

/**
 * Elimina un elemento por su ID.
 * @param {string} storeName - Nombre del almacén.
 * @param {number} id - ID del elemento.
 * @returns {Promise<void>}
 */
async function remove(storeName, id) {
    if (!db) await initDB();
    return db.table(storeName).delete(parseInt(id));
}

/**
 * Limpia completamente un almacén.
 * @param {string} storeName - Nombre del almacén.
 * @returns {Promise<void>}
 */
async function clearStore(storeName) {
    if (!db) await initDB();
    return db.table(storeName).clear();
}

// Exportar funciones para uso global en la aplicación
window.initDB = initDB;
window.getAll = getAll;
window.put = put;
window.remove = remove;
window.clearStore = clearStore;
