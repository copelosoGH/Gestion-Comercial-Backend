import { asyncHandler } from '../../utils/asyncHandler.js';
import * as cuentaCorrienteService from './cuentaCorrienteService.js';
import * as validacion from './cuentaCorrienteValidacion.js';

/** POST /api/cuenta-corriente/pagos -> registra un pago e imputa FIFO. */
export const registrarPago = asyncHandler(async (req, res) => {
  const datos = validacion.validarNuevoPago(req.body);
  const pago = await cuentaCorrienteService.registrarPago(datos);
  res.status(201).json(pago);
});

/** GET /api/cuenta-corriente/pagos/:id -> recibo del pago. */
export const obtenerPago = asyncHandler(async (req, res) => {
  const idPago = validacion.parsearIdRuta(req.params.id);
  const pago = await cuentaCorrienteService.obtenerPago(idPago);
  res.json(pago);
});

/** GET /api/cuenta-corriente/clientes/:id/estado -> estado de cuenta. */
export const obtenerEstadoCuenta = asyncHandler(async (req, res) => {
  const idCliente = validacion.parsearIdRuta(req.params.id);
  const estado = await cuentaCorrienteService.obtenerEstadoCuenta(idCliente);
  res.json(estado);
});

/** GET /api/cuenta-corriente/deudores -> clientes con deuda. */
export const listarDeudores = asyncHandler(async (req, res) => {
  const deudores = await cuentaCorrienteService.listarDeudores();
  res.json(deudores);
});