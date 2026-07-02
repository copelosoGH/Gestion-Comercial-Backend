import ExcelJS from 'exceljs';

/**
 * Genera un Buffer .xlsx a partir de columnas + filas.
 *   columnas: [{ titulo, clave, ancho? }]
 *   filas:    [{ <clave>: valor, ... }]
 *
 * Uso genérico para cualquier reporte (o exportación futura).
 */
export async function generarExcel({ nombre, columnas, filas }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Gestión Polirubro';
  wb.created = new Date();

  const ws = wb.addWorksheet(nombre || 'Reporte');

  ws.columns = columnas.map((c) => ({
    header: c.titulo,
    key: c.clave,
    width: c.ancho ?? 20,
  }));

  // Encabezado en negrita.
  const encabezado = ws.getRow(1);
  encabezado.font = { bold: true };
  encabezado.alignment = { vertical: 'middle' };

  for (const fila of filas) {
    ws.addRow(fila);
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}