import { ApiError } from '../../utils/apiError.js';

// Medios de pago de un cobro real (cuenta corriente NO es un medio de cobro).
const MEDIOS_PAGO_VALIDOS = ['EFECTIVO', 'DEBITO', 'CREDITO', 'TRANSFERENCIA', 'QR'];

/**
 * POST /api/cuenta-corriente/pagos
 * { idUsuario, idCliente, monto, medioPago, observacion? }
 */
export function validarNuevoPago(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw ApiError.badRequest('El cuerpo de la petición debe ser un objeto.');
  }
  const idUsuario = exigirId(body.idUsuario, 'idUsuario');
  const idCliente = exigirId(body.idCliente, 'idCliente');
  const monto = exigirNumeroPositivo(body.monto, 'monto');

  if (typeof body.medioPago !== 'string' || !MEDIOS_PAGO_VALIDOS.includes(body.medioPago)) {
    throw ApiError.badRequest(`El campo "medioPago" debe ser uno de: ${MEDIOS_PAGO_VALIDOS.join(', ')}.`);
  }
  const observacion = textoOpcional(body.observacion, 'observacion', 500);

  return { idUsuario, idCliente, monto, medioPago: body.medioPago, observacion };
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

function exigirNumeroPositivo(valor, campo) {
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0) {
    throw ApiError.badRequest(`El campo "${campo}" debe ser un número mayor a 0.`);
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