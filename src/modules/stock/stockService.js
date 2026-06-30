import { ApiError } from '../../utils/apiError.js';
import { withTransaction } from '../../config/db.js';
import * as stockShared from '../../shared/stockRepository.js';
import * as stockRepository from './stockRepository.js';

/**
 * Transferencia entre ubicaciones (depósito <-> local).
 * Genera UN movimiento TRANSFERENCIA con dos líneas por item:
 * egreso en origen (-) e ingreso en destino (+). El total no cambia.
 */
export async function crearTransferencia(datos) {
  const idMovimiento = await withTransaction(async (client) => {
    if (!(await stockShared.existeUsuario(client, datos.idUsuario))) {
      throw ApiError.badRequest('El usuario indicado no existe.');
    }
    const idOrigen = await stockShared.obtenerIdUbicacionPorId(client, datos.idUbicacionOrigen);
    const idDestino = await stockShared.obtenerIdUbicacionPorId(client, datos.idUbicacionDestino);
    if (!idOrigen || !idDestino) {
      throw ApiError.badRequest('Alguna de las ubicaciones no existe.');
    }

    const items = [...datos.items].sort((a, b) => a.idVariante - b.idVariante);
    for (const item of items) {
      const variante = await stockRepository.obtenerVarianteParaMovimiento(client, item.idVariante);
      if (!variante) {
        throw ApiError.badRequest(`La variante ${item.idVariante} no existe o está inactiva.`);
      }
      item.precioCosto = variante.precioCosto;
    }

    const idMov = await stockShared.insertarMovimientoStock(client, {
      idUsuario: datos.idUsuario,
      tipo: 'TRANSFERENCIA',
      observacion: datos.observacion,
    });

    // Para evitar deadlocks lockeamos las existencias en orden de ubicación.
    const ubicacionesOrdenadas = [idOrigen, idDestino].sort((a, b) => a - b);

    for (const item of items) {
      for (const idUbi of ubicacionesOrdenadas) {
        await stockShared.asegurarExistencia(client, item.idVariante, idUbi);
        await stockShared.bloquearExistencia(client, item.idVariante, idUbi);
      }
      // egreso en origen
      await stockShared.insertarMovimientoDetalle(client, idMov, {
        idVariante: item.idVariante, idUbicacion: idOrigen,
        cantidad: -item.cantidad, costoUnitario: item.precioCosto, precioUnitario: null,
      });
      // ingreso en destino
      await stockShared.insertarMovimientoDetalle(client, idMov, {
        idVariante: item.idVariante, idUbicacion: idDestino,
        cantidad: item.cantidad, costoUnitario: item.precioCosto, precioUnitario: null,
      });
      await stockShared.descontarExistencia(client, item.idVariante, idOrigen, item.cantidad);
      await stockShared.aumentarExistencia(client, item.idVariante, idDestino, item.cantidad);
    }

    return idMov;
  });

  return { idMovimiento, tipo: 'TRANSFERENCIA' };
}

/**
 * Ajuste de inventario POR CONTEO: se carga la cantidad real contada por
 * ubicación y el sistema registra solo la diferencia como movimiento AJUSTE.
 * Si ningún item cambia, no se genera movimiento.
 */
export async function crearAjuste(datos) {
  const resultado = await withTransaction(async (client) => {
    if (!(await stockShared.existeUsuario(client, datos.idUsuario))) {
      throw ApiError.badRequest('El usuario indicado no existe.');
    }
    const idUbicacion = await stockShared.obtenerIdUbicacionPorId(client, datos.idUbicacion);
    if (!idUbicacion) {
      throw ApiError.badRequest('La ubicación indicada no existe.');
    }

    const items = [...datos.items].sort((a, b) => a.idVariante - b.idVariante);

    // Loop 1: lockear, validar y calcular diferencias.
    const cambios = [];
    const detalleResultado = [];
    for (const item of items) {
      const variante = await stockRepository.obtenerVarianteParaMovimiento(client, item.idVariante);
      if (!variante) {
        throw ApiError.badRequest(`La variante ${item.idVariante} no existe o está inactiva.`);
      }
      await stockShared.asegurarExistencia(client, item.idVariante, idUbicacion);
      const actual = await stockShared.bloquearExistencia(client, item.idVariante, idUbicacion);
      const delta = item.cantidadContada - actual;

      detalleResultado.push({
        idVariante: item.idVariante,
        anterior: actual,
        contada: item.cantidadContada,
        delta,
      });
      if (delta !== 0) {
        cambios.push({ ...item, delta, precioCosto: variante.precioCosto });
      }
    }

    if (cambios.length === 0) {
      return { idMovimiento: null, sinCambios: true, items: detalleResultado };
    }

    // Loop 2: aplicar.
    const idMov = await stockShared.insertarMovimientoStock(client, {
      idUsuario: datos.idUsuario,
      tipo: 'AJUSTE',
      observacion: datos.observacion,
    });
    for (const cambio of cambios) {
      await stockShared.insertarMovimientoDetalle(client, idMov, {
        idVariante: cambio.idVariante, idUbicacion,
        cantidad: cambio.delta, costoUnitario: cambio.precioCosto, precioUnitario: null,
      });
      await stockShared.establecerExistencia(client, cambio.idVariante, idUbicacion, cambio.cantidadContada);
    }

    return { idMovimiento: idMov, sinCambios: false, items: detalleResultado };
  });

  return { ...resultado, tipo: 'AJUSTE' };
}

/**
 * Merma: rotura, pérdida o consumo interno. Egreso de stock (-) por el tipo
 * indicado. Impacta directamente la existencia de la ubicación.
 */
export async function crearMerma(datos) {
  const idMovimiento = await withTransaction(async (client) => {
    if (!(await stockShared.existeUsuario(client, datos.idUsuario))) {
      throw ApiError.badRequest('El usuario indicado no existe.');
    }
    const idUbicacion = await stockShared.obtenerIdUbicacionPorId(client, datos.idUbicacion);
    if (!idUbicacion) {
      throw ApiError.badRequest('La ubicación indicada no existe.');
    }

    const items = [...datos.items].sort((a, b) => a.idVariante - b.idVariante);
    for (const item of items) {
      const variante = await stockRepository.obtenerVarianteParaMovimiento(client, item.idVariante);
      if (!variante) {
        throw ApiError.badRequest(`La variante ${item.idVariante} no existe o está inactiva.`);
      }
      item.precioCosto = variante.precioCosto;
    }

    const idMov = await stockShared.insertarMovimientoStock(client, {
      idUsuario: datos.idUsuario,
      tipo: datos.tipo,
      observacion: datos.observacion,
    });

    for (const item of items) {
      await stockShared.asegurarExistencia(client, item.idVariante, idUbicacion);
      await stockShared.bloquearExistencia(client, item.idVariante, idUbicacion);
      await stockShared.insertarMovimientoDetalle(client, idMov, {
        idVariante: item.idVariante, idUbicacion,
        cantidad: -item.cantidad, costoUnitario: item.precioCosto, precioUnitario: null,
      });
      await stockShared.descontarExistencia(client, item.idVariante, idUbicacion, item.cantidad);
    }

    return idMov;
  });

  return { idMovimiento, tipo: datos.tipo };
}

/** Alertas de mínimos: reposición (total) y góndola (traer del depósito). */
export async function obtenerAlertas() {
  const [reposicion, gondola] = await Promise.all([
    stockRepository.alertasReposicion(),
    stockRepository.alertasGondola(),
  ]);
  return { reposicion, gondola };
}