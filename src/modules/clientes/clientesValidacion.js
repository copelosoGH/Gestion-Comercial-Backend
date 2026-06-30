import { ApiError } from '../../utils/apiError.js';

/** Valida el cuerpo para alta/edición de cliente. */
export function validarCliente(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw ApiError.badRequest('El cuerpo de la petición debe ser un objeto.');
  }
  return {
    nombre: exigirTexto(body.nombre, 'nombre', 120),
    dniCuit: textoOpcional(body.dniCuit, 'dniCuit', 20),
    telefono: textoOpcional(body.telefono, 'telefono', 40),
    direccion: textoOpcional(body.direccion, 'direccion', 150),
    limiteCredito: numeroOpcionalNoNegativo(body.limiteCredito, 'limiteCredito'),
  };
}

export function parsearFiltros(query) {
  const pagina = exigirEnteroOpcional(query.pagina, 1, 'pagina');
  let limite = exigirEnteroOpcional(query.limite, 20, 'limite');
  if (limite > 100) limite = 100;

  let busqueda = null;
  if (typeof query.busqueda === 'string' && query.busqueda.trim() !== '') {
    busqueda = query.busqueda.trim();
  }
  return {
    pagina,
    limite,
    busqueda,
    conDeuda: query.conDeuda === 'true' || query.conDeuda === '1',
    incluirInactivos: query.incluirInactivos === 'true' || query.incluirInactivos === '1',
  };
}

export function parsearIdRuta(valor) {
  return exigirId(valor, 'id');
}

// ---- helpers ----

function exigirId(valor, campo) {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) {
    throw ApiError.badRequest(`El campo "${campo}" debe ser un entero positivo.`);
  }
  return n;
}

function exigirTexto(valor, campo, maxLargo) {
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw ApiError.badRequest(`El campo "${campo}" es obligatorio.`);
  }
  const limpio = valor.trim();
  if (limpio.length > maxLargo) {
    throw ApiError.badRequest(`El campo "${campo}" supera el largo máximo (${maxLargo}).`);
  }
  return limpio;
}

function textoOpcional(valor, campo, maxLargo) {
  if (valor === undefined || valor === null) return null;
  if (typeof valor !== 'string') {
    throw ApiError.badRequest(`El campo "${campo}" debe ser texto.`);
  }
  const limpio = valor.trim();
  if (limpio === '') return null;
  if (limpio.length > maxLargo) {
    throw ApiError.badRequest(`El campo "${campo}" supera el largo máximo (${maxLargo}).`);
  }
  return limpio;
}

function numeroOpcionalNoNegativo(valor, campo) {
  if (valor === undefined || valor === null || valor === '') return null;
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0) {
    throw ApiError.badRequest(`El campo "${campo}" debe ser un número mayor o igual a 0.`);
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