import { asyncHandler } from '../../utils/asyncHandler.js';
import * as usuariosService from './usuariosService.js';
import * as validacion from './usuariosValidacion.js';

export const listar = asyncHandler(async (req, res) => {
  const filtros = validacion.parsearFiltros(req.query);
  res.json(await usuariosService.listarUsuarios(filtros));
});

export const obtenerPorId = asyncHandler(async (req, res) => {
  const idUsuario = validacion.parsearIdRuta(req.params.id);
  res.json(await usuariosService.obtenerUsuario(idUsuario));
});

export const crear = asyncHandler(async (req, res) => {
  const datos = validacion.validarNuevoUsuario(req.body);
  res.status(201).json(await usuariosService.crearUsuario(datos));
});

export const actualizar = asyncHandler(async (req, res) => {
  const idUsuario = validacion.parsearIdRuta(req.params.id);
  const datos = validacion.validarActualizacionUsuario(req.body);
  res.json(await usuariosService.actualizarUsuario(idUsuario, datos));
});

export const darDeBaja = asyncHandler(async (req, res) => {
  const idUsuario = validacion.parsearIdRuta(req.params.id);
  const resultado = await usuariosService.darDeBajaUsuario(idUsuario, req.usuario.idUsuario);
  res.json(resultado);
});