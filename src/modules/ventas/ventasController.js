import { asyncHandler } from '../../utils/asyncHandler.js';
import * as ventasService from './ventasService.js';
import * as validacion from './ventasValidacion.js';

/** POST /api/ventas -> registra una venta. */
export const crear = asyncHandler(async (req, res) => {
  const datos = validacion.validarNuevaVenta(req.body);
  const venta = await ventasService.crearVenta(datos);
  res.status(201).json(venta);
});

/** GET /api/ventas/:id -> detalle de una venta. */
export const obtenerPorId = asyncHandler(async (req, res) => {
  const idVenta = validacion.parsearIdRuta(req.params.id);
  const venta = await ventasService.obtenerVenta(idVenta);
  res.json(venta);
});

/** GET /api/ventas -> listado paginado con filtros. */
export const listar = asyncHandler(async (req, res) => {
  const filtros = validacion.parsearFiltrosListado(req.query);
  const resultado = await ventasService.listarVentas(filtros);
  res.json(resultado);
});

/** POST /api/ventas/:id/anular -> anula una venta (revierte stock y fiado). */
export const anular = asyncHandler(async (req, res) => {
  const idVenta = validacion.parsearIdRuta(req.params.id);
  const datos = validacion.validarAnulacion(req.body);
  const venta = await ventasService.anularVenta(idVenta, datos);
  res.json(venta);
});