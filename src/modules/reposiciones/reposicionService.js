import { ApiError } from '../../utils/apiError.js';
import { withTransaction } from '../../config/db.js';
import * as stockRepository from '../../shared/stockRepository.js';
import * as reposicionRepository from './reposicionRepository.js';

const UBICACION_POR_DEFECTO = 'Local';

const redondear = (n) => Math.round(Number(n) * 100) / 100;

/**
 * Registra una reposición (compra) de forma atómica:
 *   reposicion + reposicion_detalle
 *   + movimiento_stock (COMPRA) sumando existencia en la ubicación destino
 *   + actualiza el costo actual de cada variante (último costo)
 *   + vincula/actualiza la variante con el proveedor.
 */
export async function crearReposicion(datos) {
  const idReposicion = await withTransaction(async (client) => {
    if (!(await stockRepository.existeUsuario(client, datos.idUsuario))) {
      throw ApiError.badRequest('El usuario indicado no existe.');
    }
    if (!(await reposicionRepository.existeProveedorActivo(client, datos.idProveedor))) {
      throw ApiError.badRequest('El proveedor indicado no existe o está inactivo.');
    }

    const idUbicacion = datos.idUbicacion
      ? await stockRepository.obtenerIdUbicacionPorId(client, datos.idUbicacion)
      : await stockRepository.obtenerIdUbicacionPorNombre(client, UBICACION_POR_DEFECTO);
    if (!idUbicacion) {
      throw ApiError.badRequest('La ubicación indicada no existe.');
    }

    // Validar variantes y calcular el total. Ordenamos por idVariante para
    // evitar deadlocks entre reposiciones simultáneas.
    const itemsOrdenados = [...datos.items].sort((a, b) => a.idVariante - b.idVariante);
    const lineas = [];
    let total = 0;

    for (const item of itemsOrdenados) {
      if (!(await reposicionRepository.existeVarianteActiva(client, item.idVariante))) {
        throw ApiError.badRequest(`La variante ${item.idVariante} no existe o está inactiva.`);
      }
      const unidades = item.cantidadCajas * item.unidadesPorCaja;
      total += unidades * item.costoUnitario;
      lineas.push({ ...item, unidades });
    }

    // Cabecera.
    const cabecera = await reposicionRepository.insertarReposicion(client, {
      idProveedor: datos.idProveedor,
      idUbicacion,
      idUsuario: datos.idUsuario,
      numeroFactura: datos.numeroFactura,
      total: redondear(total),
      observacion: datos.observacion,
      fecha: datos.fecha,
    });

    // Libro mayor de stock (COMPRA).
    const idMovimiento = await stockRepository.insertarMovimientoStock(client, {
      idUsuario: datos.idUsuario,
      tipo: 'COMPRA',
      idReposicion: cabecera.idReposicion,
    });

    for (const linea of lineas) {
      await reposicionRepository.insertarReposicionDetalle(client, cabecera.idReposicion, linea);

      await stockRepository.asegurarExistencia(client, linea.idVariante, idUbicacion);
      await stockRepository.bloquearExistencia(client, linea.idVariante, idUbicacion);
      await stockRepository.insertarMovimientoDetalle(client, idMovimiento, {
        idVariante: linea.idVariante,
        idUbicacion,
        cantidad: linea.unidades, // ingreso => positivo
        costoUnitario: linea.costoUnitario,
        precioUnitario: null, // una compra no tiene precio de venta
      });
      await stockRepository.aumentarExistencia(client, linea.idVariante, idUbicacion, linea.unidades);

      // Último costo + vínculo con proveedor.
      await reposicionRepository.actualizarCostoVariante(client, linea.idVariante, linea.costoUnitario);
      await reposicionRepository.upsertProductoProveedor(
        client, linea.idVariante, datos.idProveedor, linea.costoUnitario,
      );
    }

    return cabecera.idReposicion;
  });

  return obtenerReposicion(idReposicion);
}

/** Detalle de una reposición: cabecera + líneas. */
export async function obtenerReposicion(idReposicion) {
  const reposicion = await reposicionRepository.obtenerReposicionPorId(idReposicion);
  if (!reposicion) {
    throw ApiError.notFound('Reposición no encontrada');
  }
  reposicion.items = await reposicionRepository.obtenerDetalleReposicion(idReposicion);
  return reposicion;
}

/** Listado paginado con filtros (fecha, proveedor). */
export async function listarReposiciones(filtros) {
  const { pagina, limite } = filtros;
  const offset = (pagina - 1) * limite;

  const [items, total] = await Promise.all([
    reposicionRepository.listarReposiciones({ ...filtros, offset }),
    reposicionRepository.contarReposiciones(filtros),
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
 * Anula una reposición de forma atómica: revierte el ingreso de stock
 * (movimiento ANULACION_REPOSICION, descontando de la ubicación de destino)
 * y marca la reposición como anulada.
 *
 * Nota: NO revierte el costo de la variante ni el precio de referencia del
 * proveedor (no guardamos el costo anterior). Si hace falta, se corrige a
 * mano desde el producto.
 */
export async function anularReposicion(idReposicion, datos) {
  await withTransaction(async (client) => {
    if (!(await stockRepository.existeUsuario(client, datos.idUsuario))) {
      throw ApiError.badRequest('El usuario indicado no existe.');
    }

    const reposicion = await reposicionRepository.bloquearReposicion(client, idReposicion);
    if (!reposicion) {
      throw ApiError.notFound('Reposición no encontrada');
    }
    if (reposicion.anulada) {
      throw ApiError.conflict('La reposición ya está anulada.');
    }

    const lineas = await reposicionRepository.obtenerLineasMovimientoCompra(client, idReposicion);
    const idMovimiento = await stockRepository.insertarMovimientoStock(client, {
      idUsuario: datos.idUsuario,
      tipo: 'ANULACION_REPOSICION',
      idReposicion,
    });

    for (const linea of lineas) {
      const cantidadReversa = -linea.cantidad; // la compra sumó (positivo) => descontamos (negativo)
      await stockRepository.bloquearExistencia(client, linea.idVariante, linea.idUbicacion);
      await stockRepository.insertarMovimientoDetalle(client, idMovimiento, {
        idVariante: linea.idVariante,
        idUbicacion: linea.idUbicacion,
        cantidad: cantidadReversa,
        costoUnitario: linea.costoUnitario,
        precioUnitario: null,
      });
      await stockRepository.descontarExistencia(client, linea.idVariante, linea.idUbicacion, linea.cantidad);
    }

    await reposicionRepository.marcarReposicionAnulada(client, idReposicion, datos.idUsuario, datos.motivo);
  });

  return obtenerReposicion(idReposicion);
}