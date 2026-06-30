import { ApiError } from '../../utils/apiError.js';

const TIPOS_MERMA = ['ROTURA', 'PERDIDA', 'CONSUMO_INTERNO'];

/**
 * POST /api/stock/transferencias
 * { idUsuario, idUbicacionOrigen, idUbicacionDestino, observacion?, items: [{ idVariante, cantidad }] }
 */
export function validarTransferencia(body) {
  const b = exigirObjeto(body);
  const idUsuario = exigirId(b.idUsuario, 'idUsuario');
  const idUbicacionOrigen = exigirId(b.idUbicacionOrigen, 'idUbicacionOrigen');
  const idUbicacionDestino = exigirId(b.idUbicacionDestino, 'idUbicacionDestino');
  if (idUbicacionOrigen === idUbicacionDestino) {
    throw ApiError.badRequest('El origen y el destino deben ser ubicaciones distintas.');
  }
  const observacion = textoOpcional(b.observacion, 'observacion', 500);
  const items = exigirItems(b.items, (it, i) => ({
    idVariante: exigirId(it.idVariante, `items[${i}].idVariante`),
    cantidad: exigirNumeroPositivo(it.cantidad, `items[${i}].cantidad`),
  }));
  return { idUsuario, idUbicacionOrigen, idUbicacionDestino, observacion, items };
}

/**
 * POST /api/stock/ajustes
 * { idUsuario, idUbicacion, observacion?, items: [{ idVariante, cantidadContada }] }
 */
export function validarAjuste(body) {
  const b = exigirObjeto(body);
  const idUsuario = exigirId(b.idUsuario, 'idUsuario');
  const idUbicacion = exigirId(b.idUbicacion, 'idUbicacion');
  const observacion = textoOpcional(b.observacion, 'observacion', 500);
  const items = exigirItems(b.items, (it, i) => ({
    idVariante: exigirId(it.idVariante, `items[${i}].idVariante`),
    cantidadContada: exigirNumeroNoNegativo(it.cantidadContada, `items[${i}].cantidadContada`),
  }));
  return { idUsuario, idUbicacion, observacion, items };
}

/**
 * POST /api/stock/mermas
 * { idUsuario, idUbicacion, tipo, observacion?, items: [{ idVariante, cantidad }] }
 */
export function validarMerma(body) {
  const b = exigirObjeto(body);
  const idUsuario = exigirId(b.idUsuario, 'idUsuario');
  const idUbicacion = exigirId(b.idUbicacion, 'idUbicacion');
  if (typeof b.tipo !== 'string' || !TIPOS_MERMA.includes(b.tipo)) {
    throw ApiError.badRequest(`El campo "tipo" debe ser uno de: ${TIPOS_MERMA.join(', ')}.`);
  }
  const observacion = textoOpcional(b.observacion, 'observacion', 500);
  const items = exigirItems(b.items, (it, i) => ({
    idVariante: exigirId(it.idVariante, `items[${i}].idVariante`),
    cantidad: exigirNumeroPositivo(it.cantidad, `items[${i}].cantidad`),
  }));
  return { idUsuario, idUbicacion, tipo: b.tipo, observacion, items };
}

// ---- helpers ----

function exigirObjeto(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw ApiError.badRequest('El cuerpo de la petición debe ser un objeto.');
  }
  return body;
}

function exigirItems(items, mapear) {
  if (!Array.isArray(items) || items.length === 0) {
    throw ApiError.badRequest('Debe incluir al menos un item.');
  }
  return items.map((it, i) => {
    if (typeof it !== 'object' || it === null) {
      throw ApiError.badRequest(`El item #${i + 1} debe ser un objeto.`);
    }
    return mapear(it, i);
  });
}

function exigirId(valor, campo) {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) {
    throw ApiError.badRequest(`El campo "${campo}" debe ser un entero positivo.`);
  }
  return n;
}

function exigirNumeroPositivo(valor, campo) {
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0) {
    throw ApiError.badRequest(`El campo "${campo}" debe ser un número mayor a 0.`);
  }
  return n;
}

function exigirNumeroNoNegativo(valor, campo) {
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0) {
    throw ApiError.badRequest(`El campo "${campo}" debe ser un número mayor o igual a 0.`);
  }
  return n;
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