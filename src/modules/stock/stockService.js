import { ApiError } from '../../utils/apiError.js';
import { withTransaction } from '../../config/db.js';
import * as stockRepository from './stockRepository.js';

/**
 * Transferencia entre ubicaciones (depósito <-> local).
 * Genera UN movimiento TRANSFERENCIA con dos líneas por item:
 * egreso en origen (-) e ingreso en destino (+). El total no cambia.
 */
export async function crearTransferencia(datos) {
  const idMovimiento = await withTransaction(async (client) => {
    if (!(await stockRepository.existeUsuario(client, datos.idUsuario))) {
      throw ApiError.badRequest('El usuario indicado no existe.');
    }
    const idOrigen = await stockRepository.obtenerIdUbicacionPorId(client, datos.idUbicacionOrigen);
    const idDestino = await stockRepository.obtenerIdUbicacionPorId(client, datos.idUbicacionDestino);
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

    const idMov = await stockRepository.insertarMovimientoStock(client, {
      idUsuario: datos.idUsuario,
      tipo: 'TRANSFERENCIA',
      observacion: datos.observacion,
    });

    // Para evitar deadlocks lockeamos las existencias en orden de ubicación.
    const ubicacionesOrdenadas = [idOrigen, idDestino].sort((a, b) => a - b);

    for (const item of items) {
      for (const idUbi of ubicacionesOrdenadas) {
        await stockRepository.asegurarExistencia(client, item.idVariante, idUbi);
        await stockRepository.bloquearExistencia(client, item.idVariante, idUbi);
      }
      // egreso en origen
      await stockRepository.insertarMovimientoDetalle(client, idMov, {
        idVariante: item.idVariante, idUbicacion: idOrigen,
        cantidad: -item.cantidad, costoUnitario: item.precioCosto, precioUnitario: null,
      });
      // ingreso en destino
      await stockRepository.insertarMovimientoDetalle(client, idMov, {
        idVariante: item.idVariante, idUbicacion: idDestino,
        cantidad: item.cantidad, costoUnitario: item.precioCosto, precioUnitario: null,
      });
      await stockRepository.descontarExistencia(client, item.idVariante, idOrigen, item.cantidad);
      await stockRepository.aumentarExistencia(client, item.idVariante, idDestino, item.cantidad);
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
    if (!(await stockRepository.existeUsuario(client, datos.idUsuario))) {
      throw ApiError.badRequest('El usuario indicado no existe.');
    }
    const idUbicacion = await stockRepository.obtenerIdUbicacionPorId(client, datos.idUbicacion);
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
      await stockRepository.asegurarExistencia(client, item.idVariante, idUbicacion);
      const actual = await stockRepository.bloquearExistencia(client, item.idVariante, idUbicacion);
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
    const idMov = await stockRepository.insertarMovimientoStock(client, {
      idUsuario: datos.idUsuario,
      tipo: 'AJUSTE',
      observacion: datos.observacion,
    });
    for (const cambio of cambios) {
      await stockRepository.insertarMovimientoDetalle(client, idMov, {
        idVariante: cambio.idVariante, idUbicacion,
        cantidad: cambio.delta, costoUnitario: cambio.precioCosto, precioUnitario: null,
      });
      await stockRepository.establecerExistencia(client, cambio.idVariante, idUbicacion, cambio.cantidadContada);
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
    if (!(await stockRepository.existeUsuario(client, datos.idUsuario))) {
      throw ApiError.badRequest('El usuario indicado no existe.');
    }
    const idUbicacion = await stockRepository.obtenerIdUbicacionPorId(client, datos.idUbicacion);
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

    const idMov = await stockRepository.insertarMovimientoStock(client, {
      idUsuario: datos.idUsuario,
      tipo: datos.tipo,
      observacion: datos.observacion,
    });

    for (const item of items) {
      await stockRepository.asegurarExistencia(client, item.idVariante, idUbicacion);
      await stockRepository.bloquearExistencia(client, item.idVariante, idUbicacion);
      await stockRepository.insertarMovimientoDetalle(client, idMov, {
        idVariante: item.idVariante, idUbicacion,
        cantidad: -item.cantidad, costoUnitario: item.precioCosto, precioUnitario: null,
      });
      await stockRepository.descontarExistencia(client, item.idVariante, idUbicacion, item.cantidad);
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

/**
 * Consulta de existencias paginada: por cada variante, el stock por ubicación
 * y el total. Filtros: búsqueda, rubro, ubicación.
 */
export async function listarExistencias(filtros) {
  const { pagina, limite } = filtros;
  const offset = (pagina - 1) * limite;

  const [variantes, total] = await Promise.all([
    stockRepository.listarExistencias({ ...filtros, offset }),
    stockRepository.contarExistencias(filtros),
  ]);

  const ids = variantes.map((v) => v.idVariante);
  const existencias = await stockRepository.obtenerExistenciasDeVariantes(ids);

  const porVariante = new Map();
  for (const e of existencias) {
    if (!porVariante.has(e.idVariante)) porVariante.set(e.idVariante, []);
    porVariante.get(e.idVariante).push({
      idUbicacion: e.idUbicacion,
      ubicacion: e.ubicacion,
      cantidad: e.cantidad,
      stockMinimo: e.stockMinimo,
    });
  }

  const items = variantes.map((v) => ({
    ...v,
    existencias: porVariante.get(v.idVariante) ?? [],
  }));

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