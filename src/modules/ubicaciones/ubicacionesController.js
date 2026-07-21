import { asyncHandler } from '../../utils/asyncHandler.js';
import * as ubicacionesService from './ubicacionesService.js';
import * as validacion from './ubicacionesValidacion.js';

export const listar = asyncHandler(async (req, res) => {
  res.json(await ubicacionesService.listarUbicaciones(validacion.parsearIncluirInactivos(req.query)));
});

export const obtenerPorId = asyncHandler(async (req, res) => {
  res.json(await ubicacionesService.obtenerUbicacion(validacion.parsearIdRuta(req.params.id)));
});

export const crear = asyncHandler(async (req, res) => {
  const datos = validacion.validarUbicacion(req.body);
  res.status(201).json(await ubicacionesService.crearUbicacion(datos));
});

export const actualizar = asyncHandler(async (req, res) => {
  const idUbicacion = validacion.parsearIdRuta(req.params.id);
  const datos = validacion.validarUbicacion(req.body);
  res.json(await ubicacionesService.actualizarUbicacion(idUbicacion, datos));
});

export const darDeBaja = asyncHandler(async (req, res) => {
  res.json(await ubicacionesService.darDeBajaUbicacion(validacion.parsearIdRuta(req.params.id)));
});