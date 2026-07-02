import { asyncHandler } from '../../utils/asyncHandler.js';
import * as productosService from './productosService.js';
import * as validacion from './productosValidacion.js';

/** GET /api/productos -> listado paginado con búsqueda y filtro por rubro. */
export const listar = asyncHandler(async (req, res) => {
  const filtros = validacion.parsearFiltrosListado(req.query);
  const resultado = await productosService.listarProductos(filtros);
  res.json(resultado);
});

/** GET /api/productos/:id -> detalle del producto con sus variantes. */
export const obtenerPorId = asyncHandler(async (req, res) => {
  const idProducto = validacion.parsearId(req.params.id);
  const producto = await productosService.obtenerProducto(idProducto);
  res.json(producto);
});

/** PUT /api/productos/:id -> actualiza la cabecera y, opcional, sus variantes. */
export const actualizar = asyncHandler(async (req, res) => {
  const idProducto = validacion.parsearId(req.params.id);
  const datos = validacion.validarActualizacionProducto(req.body);
  const producto = await productosService.actualizarProducto(idProducto, datos);
  res.json(producto);
});

/** POST /api/productos -> alta anidada (producto + primera variante). */
export const crear = asyncHandler(async (req, res) => {
  const datos = validacion.validarNuevoProducto(req.body);
  const producto = await productosService.crearProducto(datos);
  res.status(201).json(producto);
});

/** DELETE /api/productos/:id -> baja lógica. */
export const darDeBaja = asyncHandler(async (req, res) => {
  const idProducto = validacion.parsearId(req.params.id);
  const resultado = await productosService.darDeBajaProducto(idProducto);
  res.json(resultado);
});