// ./assets/js/cleanup.js

// Función para borrar registros antiguos
async function cleanupOldRecords(days = 30) {
  try {
    const db = await getDatabase();
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - days);

    const count = await db.asistencias
      .where('checkIn')
      .below(threshold)
      .delete();

    return `Se eliminaron ${count} registros anteriores a ${threshold.toLocaleDateString()}.`;
  } catch (error) {
    console.error("Error al limpiar registros:", error);
    return "Error al limpiar registros.";
  }
}