// ./assets/js/reports.js

// Función para calcular la distancia entre dos coordenadas (en metros)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Función para cargar los datos del reporte
async function loadReportData() {
  try {
    const db = await getDatabase(); // Función para obtener la base de datos Dexie
    const allRecords = await db.asistencias.toArray();

    // Filtrar registros problemáticos
    const problematicRecords = allRecords.filter(record => {
      const workedHours = record.checkOut ?
        (new Date(record.checkOut) - new Date(record.checkIn)) / (1000 * 60 * 60) :
        0;
      const isShortDay = workedHours < 8;
      const distanceFromHome = record.homeLat && record.homeLon ?
        calculateDistance(record.lat, record.lon, record.homeLat, record.homeLon) :
        null;
      const isOutOfLocation = distanceFromHome && distanceFromHome > 500; // Más de 500 metros

      return isShortDay || isOutOfLocation;
    });

    // Renderizar en la vista
    const tableBody = document.querySelector('#reportTable tbody');
    if (tableBody) {
      tableBody.innerHTML = problematicRecords.map(record => {
        const workedHours = record.checkOut ?
          (new Date(record.checkOut) - new Date(record.checkIn)) / (1000 * 60 * 60) :
          0;
        const distanceFromHome = record.homeLat && record.homeLon ?
          calculateDistance(record.lat, record.lon, record.homeLat, record.homeLon) :
          'N/A';

        return `
          <tr>
            <td>${record.userName || 'N/A'}</td>
            <td>${new Date(record.checkIn).toLocaleString()}</td>
            <td>${record.checkOut ? new Date(record.checkOut).toLocaleString() : 'Sin check-out'}</td>
            <td>${distanceFromHome !== 'N/A' ? `${Math.round(distanceFromHome)}m` : 'N/A'}</td>
            <td>${workedHours < 8 ? '⚠️ Jornada corta' : isOutOfLocation ? '⚠️ Fuera de ubicación' : '✅ OK'}</td>
          </tr>
        `;
      }).join('');
    }
  } catch (error) {
    console.error("Error al cargar reportes:", error);
  }
}