import { asyncHandler } from '../../utils/asyncHandler.js';
import * as clientesService from './clientesService.js';
import * as validacion from './clientesValidacion.js';

/** GET /api/clientes -> listado paginado (búsqueda, conDeuda). */
export const listar = asyncHandler(async (req, res) => {
  const filtros = validacion.parsearFiltros(req.query);
  const resultado = await clientesService.listarClientes(filtros);
  res.json(resultado);
});

/** GET /api/clientes/:id -> detalle. */
export const obtenerPorId = asyncHandler(async (req, res) => {
  const idCliente = validacion.parsearIdRuta(req.params.id);
  const cliente = await clientesService.obtenerCliente(idCliente);
  res.json(cliente);
});

/** POST /api/clientes -> alta. */
export const crear = asyncHandler(async (req, res) => {
  const datos = validacion.validarCliente(req.body);
  const cliente = await clientesService.crearCliente(datos);
  res.status(201).json(cliente);
});

/** PUT /api/clientes/:id -> edición. */
export const actualizar = asyncHandler(async (req, res) => {
  const idCliente = validacion.parsearIdRuta(req.params.id);
  const datos = validacion.validarCliente(req.body);
  const cliente = await clientesService.actualizarCliente(idCliente, datos);
  res.json(cliente);
});

/** DELETE /api/clientes/:id -> baja lógica. */
export const darDeBaja = asyncHandler(async (req, res) => {
  const idCliente = validacion.parsearIdRuta(req.params.id);
  const resultado = await clientesService.darDeBajaCliente(idCliente);
  res.json(resultado);
});