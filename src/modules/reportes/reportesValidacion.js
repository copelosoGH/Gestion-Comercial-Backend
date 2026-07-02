import { ApiError } from '../../utils/apiError.js';

const LIMITE_MAS_VENDIDOS_DEFECTO = 50;
const LIMITE_MAS_VENDIDOS_MAXIMO = 500;

/** Filtros del reporte de más vendidos: ?desde&hasta&limite */
export function parsearFiltrosMasVendidos(query) {
  let limite = exigirEnteroOpcional(query.limite, LIMITE_MAS_VENDIDOS_DEFECTO, 'limite');
  if (limite > LIMITE_MAS_VENDIDOS_MAXIMO) limite = LIMITE_MAS_VENDIDOS_MAXIMO;
  return {
    desde: fechaOpcional(query.desde, 'desde'),
    hasta: fechaOpcional(query.hasta, 'hasta'),
    limite,
  };
}

/** Filtros de márgenes y stock: ?busqueda&idRubro */
export function parsearFiltrosCatalogo(query) {
  let busqueda = null;
  if (typeof query.busqueda === 'string' && query.busqueda.trim() !== '') {
    busqueda = query.busqueda.trim();
  }
  return {
    busqueda,
    idRubro: idOpcional(query.idRubro, 'idRubro'),
  };
}

/** Formato de salida: 'json' (default) o 'excel'. */
export function parsearFormato(query) {
  const formato = query.formato ?? 'json';
  if (formato !== 'json' && formato !== 'excel') {
    throw ApiError.badRequest('El parámetro "formato" debe ser "json" o "excel".');
  }
  return formato;
}

// ---- helpers ----

function idOpcional(valor, campo) {
  if (valor === undefined || valor === null || valor === '') return null;
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) {
    throw ApiError.badRequest(`El parámetro "${campo}" debe ser un entero positivo.`);
  }
  return n;
}

function exigirEnteroOpcional(valor, porDefecto, campo) {
  if (valor === undefined || valor === '') return porDefecto;
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 1) {
    throw ApiError.badRequest(`El parámetro "${campo}" debe ser un entero mayor o igual a 1.`);
  }
  return n;
}

function fechaOpcional(valor, campo) {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor) || Number.isNaN(Date.parse(valor))) {
    throw ApiError.badRequest(`El parámetro "${campo}" debe tener formato YYYY-MM-DD.`);
  }
  return valor;
}