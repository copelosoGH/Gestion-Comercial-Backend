import { ApiError } from '../../utils/apiError.js';

/** { nombre, direccion?} */
export function validarUbicacion(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw ApiError.badRequest('El cuerpo de la petición debe ser un objeto.');
  }
  if (typeof body.nombre !== 'string' || body.nombre.trim() === '') {
    throw ApiError.badRequest('El campo "nombre" es obligatorio.');
  }
  const nombre = body.nombre.trim();
  if (nombre.length > 40) {
    throw ApiError.badRequest('El campo "nombre" supera el largo máximo (40).');
  }
  return {
    nombre,
    direccion: textoOpcional(body.direccion, 'direccion', 150)
  };
}

export function parsearIncluirInactivos(query) {
  return query.incluirInactivos === 'true' || query.incluirInactivos === '1';
}

export function parsearIdRuta(valor) {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) {
    throw ApiError.badRequest('El campo "id" debe ser un entero positivo.');
  }
  return n;
}

// ---- helpers ----

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