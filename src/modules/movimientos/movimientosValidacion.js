import { ApiError } from '../../utils/apiError.js';

const TIPOS_VALIDOS = [
  'COMPRA', 'VENTA', 'AJUSTE', 'ROTURA', 'PERDIDA', 'CONSUMO_INTERNO',
  'TRANSFERENCIA', 'ANULACION_VENTA', 'ANULACION_REPOSICION',
];

/** GET /api/movimientos -> ?idVariante&idUbicacion&tipoMovimiento&desde&hasta&pagina&limite */
export function parsearFiltros(query) {
  const pagina = exigirEnteroOpcional(query.pagina, 1, 'pagina');
  let limite = exigirEnteroOpcional(query.limite, 20, 'limite');
  if (limite > 100) limite = 100;

  let tipoMovimiento = null;
  if (query.tipoMovimiento) {
    if (!TIPOS_VALIDOS.includes(query.tipoMovimiento)) {
      throw ApiError.badRequest(`El parámetro "tipoMovimiento" debe ser uno de: ${TIPOS_VALIDOS.join(', ')}.`);
    }
    tipoMovimiento = query.tipoMovimiento;
  }

  return {
    pagina,
    limite,
    idVariante: idOpcional(query.idVariante, 'idVariante'),
    idUbicacion: idOpcional(query.idUbicacion, 'idUbicacion'),
    tipoMovimiento,
    desde: fechaOpcional(query.desde, 'desde'),
    hasta: fechaOpcional(query.hasta, 'hasta'),
  };
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