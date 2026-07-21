import { ApiError } from '../../utils/apiError.js';

/** { nombre } — usado por rubro y marca. */
export function validarNombre(body, maxLargo = 60) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw ApiError.badRequest('El cuerpo de la petición debe ser un objeto.');
  }
  if (typeof body.nombre !== 'string' || body.nombre.trim() === '') {
    throw ApiError.badRequest('El campo "nombre" es obligatorio.');
  }
  const limpio = body.nombre.trim();
  if (limpio.length > maxLargo) {
    throw ApiError.badRequest(`El campo "nombre" supera el largo máximo (${maxLargo}).`);
  }
  return limpio;
}

/** { idRubro, nombre } — subrubro. */
export function validarSubrubro(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw ApiError.badRequest('El cuerpo de la petición debe ser un objeto.');
  }
  return {
    idRubro: exigirId(body.idRubro, 'idRubro'),
    nombre: validarNombre(body, 60),
  };
}

export function parsearIncluirInactivos(query) {
  return query.incluirInactivos === 'true' || query.incluirInactivos === '1';
}

export function parsearFiltrosSubrubros(query) {
  return {
    idRubro: idOpcional(query.idRubro, 'idRubro'),
    incluirInactivos: parsearIncluirInactivos(query),
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

function idOpcional(valor, campo) {
  if (valor === undefined || valor === null || valor === '') return null;
  return exigirId(valor, campo);
}