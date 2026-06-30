import { ApiError } from '../../utils/apiError.js';

const REGEX_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Valida el cuerpo para alta/edición de proveedor. */
export function validarProveedor(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw ApiError.badRequest('El cuerpo de la petición debe ser un objeto.');
  }
  return {
    nombre: exigirTexto(body.nombre, 'nombre', 120),
    telefono: textoOpcional(body.telefono, 'telefono', 40),
    email: emailOpcional(body.email),
    direccion: textoOpcional(body.direccion, 'direccion', 150),
    observaciones: textoOpcional(body.observaciones, 'observaciones', 1000),
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

function emailOpcional(valor) {
  const limpio = textoOpcional(valor, 'email', 120);
  if (limpio === null) return null;
  if (!REGEX_EMAIL.test(limpio)) {
    throw ApiError.badRequest('El email no tiene un formato válido.');
  }
  return limpio;
}

function exigirEnteroOpcional(valor, porDefecto, campo) {
  if (valor === undefined || valor === '') return porDefecto;
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 1) {
    throw ApiError.badRequest(`El parámetro "${campo}" debe ser un entero mayor o igual a 1.`);
  }
  return n;
}