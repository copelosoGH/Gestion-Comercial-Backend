import { asyncHandler } from '../../utils/asyncHandler.js';
import * as proveedoresService from './proveedoresService.js';
import * as validacion from './proveedoresValidacion.js';

/** GET /api/proveedores -> listado paginado (búsqueda). */
export const listar = asyncHandler(async (req, res) => {
  const filtros = validacion.parsearFiltros(req.query);
  const resultado = await proveedoresService.listarProveedores(filtros);
  res.json(resultado);
});

/** GET /api/proveedores/:id -> detalle. */
export const obtenerPorId = asyncHandler(async (req, res) => {
  const idProveedor = validacion.parsearIdRuta(req.params.id);
  const proveedor = await proveedoresService.obtenerProveedor(idProveedor);
  res.json(proveedor);
});

/** POST /api/proveedores -> alta. */
export const crear = asyncHandler(async (req, res) => {
  const datos = validacion.validarProveedor(req.body);
  const proveedor = await proveedoresService.crearProveedor(datos);
  res.status(201).json(proveedor);
});

/** PUT /api/proveedores/:id -> edición. */
export const actualizar = asyncHandler(async (req, res) => {
  const idProveedor = validacion.parsearIdRuta(req.params.id);
  const datos = validacion.validarProveedor(req.body);
  const proveedor = await proveedoresService.actualizarProveedor(idProveedor, datos);
  res.json(proveedor);
});

/** DELETE /api/proveedores/:id -> baja lógica. */
export const darDeBaja = asyncHandler(async (req, res) => {
  const idProveedor = validacion.parsearIdRuta(req.params.id);
  const resultado = await proveedoresService.darDeBajaProveedor(idProveedor);
  res.json(resultado);
});