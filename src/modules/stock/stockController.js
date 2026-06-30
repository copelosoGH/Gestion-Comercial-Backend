import { asyncHandler } from '../../utils/asyncHandler.js';
import * as stockService from './stockService.js';
import * as validacion from './stockValidacion.js';

/** POST /api/stock/transferencias -> mueve stock entre ubicaciones. */
export const transferir = asyncHandler(async (req, res) => {
  const datos = validacion.validarTransferencia(req.body);
  const resultado = await stockService.crearTransferencia(datos);
  res.status(201).json(resultado);
});

/** POST /api/stock/ajustes -> ajuste por conteo (registra la diferencia). */
export const ajustar = asyncHandler(async (req, res) => {
  const datos = validacion.validarAjuste(req.body);
  const resultado = await stockService.crearAjuste(datos);
  res.status(201).json(resultado);
});

/** POST /api/stock/mermas -> rotura / pérdida / consumo interno. */
export const registrarMerma = asyncHandler(async (req, res) => {
  const datos = validacion.validarMerma(req.body);
  const resultado = await stockService.crearMerma(datos);
  res.status(201).json(resultado);
});

/** GET /api/stock/alertas -> alertas de mínimos (reposición y góndola). */
export const obtenerAlertas = asyncHandler(async (req, res) => {
  const alertas = await stockService.obtenerAlertas();
  res.json(alertas);
});