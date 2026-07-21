import { asyncHandler } from '../../utils/asyncHandler.js';
import * as movimientosService from './movimientosService.js';
import * as validacion from './movimientosValidacion.js';

/** GET /api/movimientos -> historial del libro mayor, con filtros. */
export const listar = asyncHandler(async (req, res) => {
  const filtros = validacion.parsearFiltros(req.query);
  res.json(await movimientosService.listarMovimientos(filtros));
});