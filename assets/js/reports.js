// reports.js

// Función para cargar y renderizar los datos de reportes
async function renderReportsView() {
    try {
        const reportsData = await loadReportData();
        const reportsContainer = document.getElementById('reports-container');

        if (!reportsContainer) {
            console.error("No se encontró el contenedor para los reportes.");
            return;
        }

        // Limpiar el contenedor
        reportsContainer.innerHTML = '';

        // Verificar si hay datos
        if (!reportsData || reportsData.length === 0) {
            reportsContainer.innerHTML = '<p class="text-gray-500">No hay datos de reportes disponibles.</p>';
            return;
        }

        // Crear una tabla para mostrar los reportes
        const table = document.createElement('table');
        table.className = 'min-w-full bg-white border border-gray-200';

        // Crear encabezados de tabla
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th class="py-2 px-4 border-b">ID</th>
                <th class="py-2 px-4 border-b">Empleado</th>
                <th class="py-2 px-4 border-b">Entrada</th>
                <th class="py-2 px-4 border-b">Salida</th>
                <th class="py-2 px-4 border-b">Fecha</th>
            </tr>
        `;
        table.appendChild(thead);

        // Crear filas de datos
        const tbody = document.createElement('tbody');
        reportsData.forEach(report => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="py-2 px-4 border-b">${report.id}</td>
                <td class="py-2 px-4 border-b">${report.employeeName || 'N/A'}</td>
                <td class="py-2 px-4 border-b">${report.clockIn || 'N/A'}</td>
                <td class="py-2 px-4 border-b">${report.clockOut || 'N/A'}</td>
                <td class="py-2 px-4 border-b">${report.date || 'N/A'}</td>
            `;
            tbody.appendChild(row);
        });
        table.appendChild(tbody);

        // Agregar la tabla al contenedor
        reportsContainer.appendChild(table);
    } catch (error) {
        console.error("Error al renderizar los reportes:", error);
        document.getElementById('reports-container').innerHTML = '<p class="text-red-500">Error al cargar los reportes.</p>';
    }
}