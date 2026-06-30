import { asyncHandler } from '../../utils/asyncHandler.js';
import * as reposicionService from './reposicionService.js';
import * as validacion from './reposicionValidacion.js';

/** POST /api/reposiciones -> registra una reposición (compra). */
export const crear = asyncHandler(async (req, res) => {
  const datos = validacion.validarNuevaReposicion(req.body);
  const reposicion = await reposicionService.crearReposicion(datos);
  res.status(201).json(reposicion);
});

/** GET /api/reposiciones -> listado paginado con filtros. */
export const listar = asyncHandler(async (req, res) => {
  const filtros = validacion.parsearFiltrosListado(req.query);
  const resultado = await reposicionService.listarReposiciones(filtros);
  res.json(resultado);
});

/** GET /api/reposiciones/:id -> detalle de una reposición. */
export const obtenerPorId = asyncHandler(async (req, res) => {
  const idReposicion = validacion.parsearIdRuta(req.params.id);
  const reposicion = await reposicionService.obtenerReposicion(idReposicion);
  res.json(reposicion);
});

/** POST /api/reposiciones/:id/anular -> anula una reposición (revierte el ingreso de stock). */
export const anular = asyncHandler(async (req, res) => {
  const idReposicion = validacion.parsearIdRuta(req.params.id);
  const datos = validacion.validarAnulacion(req.body);
  const reposicion = await reposicionService.anularReposicion(idReposicion, datos);
  res.json(reposicion);
});