// db.js
const db = new Dexie("AsistenciasDB");

db.version(1).stores({
    branches: '++id,name,location',
    employees: '++id,name,nickname,branchId',
    attendance: '++id,employeeId,clockIn,clockOut,date,branchId'
});

async function initDB() {
    try {
        await db.open();
        console.log("Base de datos inicializada correctamente.");
    } catch (error) {
        console.error("Error al inicializar la base de datos:", error);
    }
}

// Función para obtener todos los registros de un store
async function getAll(storeName) {
    return await db[storeName].toArray();
}

// Función para agregar un registro
async function add(storeName, data) {
    return await db[storeName].add(data);
}

// Función para actualizar un registro
async function update(storeName, id, data) {
    return await db[storeName].update(id, data);
}

// Función para eliminar un registro
async function remove(storeName, id) {
    return await db[storeName].delete(id);
}

// Función para limpiar un store
async function clearStore(storeName) {
    return await db[storeName].clear();
}