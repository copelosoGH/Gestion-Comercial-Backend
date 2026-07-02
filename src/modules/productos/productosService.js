import { ApiError } from '../../utils/apiError.js';
import { withTransaction } from '../../config/db.js';
import * as productosRepository from './productosRepository.js';

/**
 * Lista productos con paginación, búsqueda y filtro por rubro.
 * Devuelve los items y la metadata de paginación.
 */
export async function listarProductos(filtros) {
  const { pagina, limite } = filtros;
  const offset = (pagina - 1) * limite;

  const [items, total] = await Promise.all([
    productosRepository.listarProductos({ ...filtros, offset }),
    productosRepository.contarProductos(filtros),
  ]);

  return {
    items,
    paginacion: {
      pagina,
      limite,
      total,
      totalPaginas: Math.max(1, Math.ceil(total / limite)),
    },
  };
}

/**
 * Detalle de un producto con sus variantes, y dentro de cada variante
 * el desglose de stock por ubicación (Local / Depósito).
 */
export async function obtenerProducto(idProducto) {
  const producto = await productosRepository.obtenerProductoPorId(idProducto);
  if (!producto) {
    throw ApiError.notFound('Producto no encontrado');
  }

  const variantes = await productosRepository.obtenerVariantes(idProducto);
  const existencias = await productosRepository.obtenerExistencias(idProducto);

  // Agrupo las existencias por variante para anidarlas.
  const existenciasPorVariante = new Map();
  for (const e of existencias) {
    if (!existenciasPorVariante.has(e.idVariante)) {
      existenciasPorVariante.set(e.idVariante, []);
    }
    existenciasPorVariante.get(e.idVariante).push({
      idUbicacion: e.idUbicacion,
      ubicacion: e.ubicacion,
      cantidad: e.cantidad,
      stockMinimo: e.stockMinimo,
    });
  }

  producto.variantes = variantes.map((v) => ({
    ...v,
    existencias: existenciasPorVariante.get(v.idVariante) ?? [],
  }));

  return producto;
}

/**
 * Actualiza un producto y, opcionalmente, sus variantes, de forma atómica.
 * No modifica el stock: la variante solo edita datos (precio, código, mínimos).
 */
export async function actualizarProducto(idProducto, datos) {
  await withTransaction(async (client) => {
    const existe = await productosRepository.obtenerProductoParaActualizar(client, idProducto);
    if (!existe) {
      throw ApiError.notFound('Producto no encontrado');
    }

    // Validar la clasificación contra la base.
    if (!(await productosRepository.existeRubro(client, datos.idRubro))) {
      throw ApiError.badRequest('El rubro indicado no existe.');
    }
    if (
      datos.idSubrubro !== null &&
      !(await productosRepository.subrubroPerteneceARubro(client, datos.idSubrubro, datos.idRubro))
    ) {
      throw ApiError.badRequest('El subrubro no existe o no pertenece al rubro indicado.');
    }
    if (datos.idMarca !== null && !(await productosRepository.existeMarca(client, datos.idMarca))) {
      throw ApiError.badRequest('La marca indicada no existe.');
    }

    // Validar que cada variante a editar pertenezca a este producto.
    if (datos.variantes.length > 0) {
      const idsValidas = await productosRepository.obtenerIdsVariantes(client, idProducto);
      for (const v of datos.variantes) {
        if (!idsValidas.has(v.idVariante)) {
          throw ApiError.badRequest(`La variante ${v.idVariante} no pertenece a este producto.`);
        }
      }
    }

    // Aplicar los cambios.
    await productosRepository.actualizarProducto(client, idProducto, datos);
    for (const v of datos.variantes) {
      await productosRepository.actualizarVariante(client, v.idVariante, v);
    }
  });

  // Post-commit: devuelvo el detalle ya actualizado.
  return obtenerProducto(idProducto);
}

/**
 * Alta de un producto con su primera variante, de forma atómica.
 * Crea producto + variante + existencias en 0 (sin stock inicial: el stock
 * entra por reposición o ajuste). Valida la clasificación contra la base.
 */
export async function crearProducto(datos) {
  const idProducto = await withTransaction(async (client) => {
    if (!(await productosRepository.existeRubro(client, datos.idRubro))) {
      throw ApiError.badRequest('El rubro indicado no existe.');
    }
    if (
      datos.idSubrubro !== null &&
      !(await productosRepository.subrubroPerteneceARubro(client, datos.idSubrubro, datos.idRubro))
    ) {
      throw ApiError.badRequest('El subrubro no existe o no pertenece al rubro indicado.');
    }
    if (datos.idMarca !== null && !(await productosRepository.existeMarca(client, datos.idMarca))) {
      throw ApiError.badRequest('La marca indicada no existe.');
    }

    const nuevoIdProducto = await productosRepository.crearProducto(client, datos);
    const idVariante = await productosRepository.crearVariante(client, nuevoIdProducto, datos.variante);
    await productosRepository.crearExistenciasIniciales(client, idVariante);

    return nuevoIdProducto;
  });

  return obtenerProducto(idProducto);
}

/** Baja lógica del producto (y de sus variantes). No borra nada físicamente. */
export async function darDeBajaProducto(idProducto) {
  await withTransaction(async (client) => {
    const estado = await productosRepository.obtenerEstadoProducto(client, idProducto);
    if (!estado) {
      throw ApiError.notFound('Producto no encontrado');
    }
    if (!estado.activo) {
      throw ApiError.conflict('El producto ya está dado de baja.');
    }
    await productosRepository.darDeBajaProducto(client, idProducto);
  });

  return { idProducto, activo: false };
}