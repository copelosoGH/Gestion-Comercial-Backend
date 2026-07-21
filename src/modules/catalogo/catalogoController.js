import { asyncHandler } from '../../utils/asyncHandler.js';
import * as catalogoService from './catalogoService.js';
import * as validacion from './catalogoValidacion.js';

// ===================== RUBROS =====================

export const listarRubros = asyncHandler(async (req, res) => {
  res.json(await catalogoService.listarRubros(validacion.parsearIncluirInactivos(req.query)));
});

export const obtenerRubro = asyncHandler(async (req, res) => {
  res.json(await catalogoService.obtenerRubro(validacion.parsearIdRuta(req.params.id)));
});

export const crearRubro = asyncHandler(async (req, res) => {
  const nombre = validacion.validarNombre(req.body, 60);
  res.status(201).json(await catalogoService.crearRubro(nombre));
});

export const actualizarRubro = asyncHandler(async (req, res) => {
  const idRubro = validacion.parsearIdRuta(req.params.id);
  const nombre = validacion.validarNombre(req.body, 60);
  res.json(await catalogoService.actualizarRubro(idRubro, nombre));
});

export const darDeBajaRubro = asyncHandler(async (req, res) => {
  res.json(await catalogoService.darDeBajaRubro(validacion.parsearIdRuta(req.params.id)));
});

// ===================== SUBRUBROS =====================

export const listarSubrubros = asyncHandler(async (req, res) => {
  res.json(await catalogoService.listarSubrubros(validacion.parsearFiltrosSubrubros(req.query)));
});

export const obtenerSubrubro = asyncHandler(async (req, res) => {
  res.json(await catalogoService.obtenerSubrubro(validacion.parsearIdRuta(req.params.id)));
});

export const crearSubrubro = asyncHandler(async (req, res) => {
  const datos = validacion.validarSubrubro(req.body);
  res.status(201).json(await catalogoService.crearSubrubro(datos.idRubro, datos.nombre));
});

export const actualizarSubrubro = asyncHandler(async (req, res) => {
  const idSubrubro = validacion.parsearIdRuta(req.params.id);
  const datos = validacion.validarSubrubro(req.body);
  res.json(await catalogoService.actualizarSubrubro(idSubrubro, datos.idRubro, datos.nombre));
});

export const darDeBajaSubrubro = asyncHandler(async (req, res) => {
  res.json(await catalogoService.darDeBajaSubrubro(validacion.parsearIdRuta(req.params.id)));
});

// ===================== MARCAS =====================

export const listarMarcas = asyncHandler(async (req, res) => {
  res.json(await catalogoService.listarMarcas(validacion.parsearIncluirInactivos(req.query)));
});

export const obtenerMarca = asyncHandler(async (req, res) => {
  res.json(await catalogoService.obtenerMarca(validacion.parsearIdRuta(req.params.id)));
});

export const crearMarca = asyncHandler(async (req, res) => {
  const nombre = validacion.validarNombre(req.body, 80);
  res.status(201).json(await catalogoService.crearMarca(nombre));
});

export const actualizarMarca = asyncHandler(async (req, res) => {
  const idMarca = validacion.parsearIdRuta(req.params.id);
  const nombre = validacion.validarNombre(req.body, 80);
  res.json(await catalogoService.actualizarMarca(idMarca, nombre));
});

export const darDeBajaMarca = asyncHandler(async (req, res) => {
  res.json(await catalogoService.darDeBajaMarca(validacion.parsearIdRuta(req.params.id)));
});