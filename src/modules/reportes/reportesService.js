import * as reportesRepository from './reportesRepository.js';
import * as stockRepository from '../stock/stockRepository.js';

/**
 * Cada reporte devuelve { nombre, columnas, filas }.
 *   - nombre: para el nombre de archivo / hoja en Excel.
 *   - columnas: [{ titulo, clave, ancho }] -> orden y encabezados del Excel.
 *   - filas: los datos.
 * El controller decide si responde JSON (solo filas) o Excel (con columnas).
 */

export async function masVendidos(filtros) {
  const filas = await reportesRepository.masVendidos(filtros);
  return {
    nombre: 'mas-vendidos',
    columnas: [
      { titulo: 'Producto', clave: 'producto', ancho: 40 },
      { titulo: 'Variante', clave: 'descripcion', ancho: 40 },
      { titulo: 'Rubro', clave: 'rubro', ancho: 18 },
      { titulo: 'Cantidad vendida', clave: 'cantidadVendida', ancho: 16 },
      { titulo: 'Monto vendido', clave: 'montoVendido', ancho: 16 },
    ],
    filas,
  };
}

export async function margenes(filtros) {
  const filas = await reportesRepository.margenes(filtros);
  return {
    nombre: 'margenes',
    columnas: [
      { titulo: 'Producto', clave: 'producto', ancho: 40 },
      { titulo: 'Variante', clave: 'descripcion', ancho: 40 },
      { titulo: 'Rubro', clave: 'rubro', ancho: 18 },
      { titulo: 'Costo', clave: 'precioCosto', ancho: 14 },
      { titulo: 'Precio venta', clave: 'precioVenta', ancho: 14 },
      { titulo: 'Ganancia unit.', clave: 'gananciaUnitaria', ancho: 14 },
      { titulo: 'Margen %', clave: 'margenPorcentaje', ancho: 12 },
    ],
    filas,
  };
}

export async function stock(filtros) {
  const filas = await reportesRepository.stockActual(filtros);
  return {
    nombre: 'stock',
    columnas: [
      { titulo: 'Código', clave: 'codigoBarras', ancho: 18 },
      { titulo: 'Producto', clave: 'producto', ancho: 40 },
      { titulo: 'Variante', clave: 'descripcion', ancho: 40 },
      { titulo: 'Rubro', clave: 'rubro', ancho: 18 },
      { titulo: 'Local', clave: 'stockLocal', ancho: 12 },
      { titulo: 'Depósito', clave: 'stockDeposito', ancho: 12 },
      { titulo: 'Total', clave: 'stockTotal', ancho: 12 },
      { titulo: 'Costo', clave: 'precioCosto', ancho: 14 },
      { titulo: 'Valor stock', clave: 'valorStock', ancho: 16 },
    ],
    filas,
  };
}

export async function reposicion() {
  // Reúsa la query de alertas de reposición del módulo de stock.
  const filas = await stockRepository.alertasReposicion();
  return {
    nombre: 'reposicion',
    columnas: [
      { titulo: 'Producto', clave: 'producto', ancho: 40 },
      { titulo: 'Variante', clave: 'descripcion', ancho: 40 },
      { titulo: 'Stock total', clave: 'stockTotal', ancho: 14 },
      { titulo: 'Mínimo', clave: 'stockMinimoTotal', ancho: 14 },
    ],
    filas,
  };
}