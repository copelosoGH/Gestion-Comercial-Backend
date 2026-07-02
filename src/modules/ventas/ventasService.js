import { ApiError } from '../../utils/apiError.js';
import { withTransaction } from '../../config/db.js';
import * as ventasRepository from './ventasRepository.js';
import * as stockRepository from '../stock/stockRepository.js';

const UBICACION_POR_DEFECTO = 'Local';

// Política de stock (v1): permitimos vender aunque el stock quede negativo,
// porque el stock importado es imperfecto y la caja no debe trabarse. El
// negativo queda como señal para revisar. Poné false para BLOQUEAR ventas
// sin stock suficiente.
const PERMITIR_STOCK_NEGATIVO = true;

// Helpers de dinero (trabajamos comparaciones en centavos para evitar
// errores de punto flotante).
const aCentavos = (n) => Math.round(Number(n) * 100);
const redondear = (n) => Math.round(Number(n) * 100) / 100;

/**
 * Registra una venta de forma atómica:
 *   venta + venta_detalle + venta_pago
 *   + movimiento_stock (VENTA) con descuento de existencia
 *   + remito de cuenta corriente si hay pago en CUENTA_CORRIENTE.
 * Si algo falla, se hace ROLLBACK y no queda nada a medias.
 */
export async function crearVenta(datos) {
  const idVenta = await withTransaction(async (client) => {
    // 1. Usuario que registra (más adelante vendrá del login).
    if (!(await stockRepository.existeUsuario(client, datos.idUsuario))) {
      throw ApiError.badRequest('El usuario indicado no existe.');
    }

    // 2. Ubicación de salida (Local por defecto).
    const idUbicacion = datos.idUbicacion
      ? await stockRepository.obtenerIdUbicacionPorId(client, datos.idUbicacion)
      : await stockRepository.obtenerIdUbicacionPorNombre(client, UBICACION_POR_DEFECTO);
    if (!idUbicacion) {
      throw ApiError.badRequest('La ubicación indicada no existe.');
    }

    // 3. Lockear existencia y resolver precios server-side.
    //    Ordenamos por idVariante para evitar deadlocks entre cajas.
    const itemsOrdenados = [...datos.items].sort((a, b) => a.idVariante - b.idVariante);
    const lineas = [];
    let total = 0;

    for (const item of itemsOrdenados) {
      const variante = await ventasRepository.obtenerVarianteParaVenta(client, item.idVariante);
      if (!variante) {
        throw ApiError.badRequest(`La variante ${item.idVariante} no existe o está inactiva.`);
      }

      await stockRepository.asegurarExistencia(client, item.idVariante, idUbicacion);
      const disponible = await stockRepository.bloquearExistencia(client, item.idVariante, idUbicacion);

      if (!PERMITIR_STOCK_NEGATIVO && disponible < item.cantidad) {
        throw ApiError.conflict(
          `Stock insuficiente de "${variante.descripcion}".`,
          { disponible, solicitado: item.cantidad },
        );
      }

      total += variante.precioVenta * item.cantidad;
      lineas.push({
        idVariante: item.idVariante,
        cantidad: item.cantidad,
        precioUnitario: variante.precioVenta,
        costoUnitario: variante.precioCosto,
      });
    }

    // 4. Los pagos deben sumar el total exacto.
    const totalPagos = datos.pagos.reduce((acc, p) => acc + p.monto, 0);
    if (aCentavos(totalPagos) !== aCentavos(total)) {
      throw ApiError.badRequest('Los pagos no coinciden con el total de la venta.', {
        totalVenta: redondear(total),
        totalPagos: redondear(totalPagos),
      });
    }

    // 5. Fiado: si hay pago en CUENTA_CORRIENTE, exige cliente válido.
    const montoFiado = datos.pagos
      .filter((p) => p.medioPago === 'CUENTA_CORRIENTE')
      .reduce((acc, p) => acc + p.monto, 0);

    if (montoFiado > 0) {
      if (!datos.idCliente) {
        throw ApiError.badRequest('Para vender en cuenta corriente hay que indicar el cliente.');
      }
      if (!(await ventasRepository.existeClienteActivo(client, datos.idCliente))) {
        throw ApiError.badRequest('El cliente indicado no existe o está inactivo.');
      }
    }

    // 6. Cabecera.
    const venta = await ventasRepository.insertarVenta(client, {
      idUsuario: datos.idUsuario,
      idCliente: datos.idCliente,
      total: redondear(total),
      observacion: datos.observacion,
    });

    // 7. Detalle + pagos.
    for (const linea of lineas) {
      await ventasRepository.insertarVentaDetalle(client, venta.idVenta, linea);
    }
    for (const pago of datos.pagos) {
      await ventasRepository.insertarVentaPago(client, venta.idVenta, pago);
    }

    // 8. Libro mayor de stock + descuento de existencia.
    const idMovimiento = await stockRepository.insertarMovimientoStock(client, {
      idUsuario: datos.idUsuario,
      idVenta: venta.idVenta,
      tipo: 'VENTA',
    });
    for (const linea of lineas) {
      await stockRepository.insertarMovimientoDetalle(client, idMovimiento, {
        idVariante: linea.idVariante,
        idUbicacion,
        cantidad: -linea.cantidad, // egreso => negativo
        costoUnitario: linea.costoUnitario,
        precioUnitario: linea.precioUnitario,
      });
      await stockRepository.descontarExistencia(client, linea.idVariante, idUbicacion, linea.cantidad);
    }

    // 9. Fiado: remito + saldo del cliente.
    if (montoFiado > 0) {
      await ventasRepository.crearRemito(client, {
        idCliente: datos.idCliente,
        idVenta: venta.idVenta,
        numeroRemito: datos.numeroRemito,
        monto: redondear(montoFiado),
      });
      await ventasRepository.sumarSaldoCliente(client, datos.idCliente, redondear(montoFiado));
    }

    return venta.idVenta;
  });

  // Post-commit: devuelvo la venta completa.
  return obtenerVenta(idVenta);
}

/** Detalle de una venta: cabecera + items + pagos. */
export async function obtenerVenta(idVenta) {
  const venta = await ventasRepository.obtenerVentaPorId(idVenta);
  if (!venta) {
    throw ApiError.notFound('Venta no encontrada');
  }
  const [items, pagos] = await Promise.all([
    ventasRepository.obtenerDetalleVenta(idVenta),
    ventasRepository.obtenerPagosVenta(idVenta),
  ]);
  return { ...venta, items, pagos };
}

/**
 * Lista ventas con paginación y filtros (fecha, usuario, cliente).
 * Por defecto oculta las anuladas (incluirAnuladas para mostrarlas).
 */
export async function listarVentas(filtros) {
  const { pagina, limite } = filtros;
  const offset = (pagina - 1) * limite;

  const [items, total] = await Promise.all([
    ventasRepository.listarVentas({ ...filtros, offset }),
    ventasRepository.contarVentas(filtros),
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
 * Anula una venta de forma atómica:
 *   - revierte el stock (movimiento ANULACION_VENTA, devuelve a su ubicación)
 *   - revierte el fiado si el remito está intacto (sin pagos)
 *   - marca la venta como anulada
 * Si el remito ya tiene pagos aplicados, se bloquea (se resuelve manual).
 */
export async function anularVenta(idVenta, datos) {
  await withTransaction(async (client) => {
    if (!(await stockRepository.existeUsuario(client, datos.idUsuario))) {
      throw ApiError.badRequest('El usuario indicado no existe.');
    }

    const venta = await ventasRepository.bloquearVenta(client, idVenta);
    if (!venta) {
      throw ApiError.notFound('Venta no encontrada');
    }
    if (venta.anulada) {
      throw ApiError.conflict('La venta ya está anulada.');
    }

    // Fiado: si el remito ya tiene pagos, no se puede anular automáticamente.
    const remito = await ventasRepository.obtenerRemitoDeVenta(client, idVenta);
    if (remito && remito.estado !== 'PENDIENTE') {
      throw ApiError.conflict(
        'No se puede anular: el fiado de esta venta ya tiene pagos aplicados. Resolvelo manualmente.',
      );
    }

    // Reversa de stock por el libro mayor.
    const lineas = await ventasRepository.obtenerLineasMovimientoVenta(client, idVenta);
    const idMovimiento = await stockRepository.insertarMovimientoStock(client, {
      idUsuario: datos.idUsuario,
      idVenta,
      tipo: 'ANULACION_VENTA',
    });
    for (const linea of lineas) {
      const cantidadReversa = -linea.cantidad; // la venta restó (negativo) => devolvemos (positivo)
      await stockRepository.bloquearExistencia(client, linea.idVariante, linea.idUbicacion);
      await stockRepository.insertarMovimientoDetalle(client, idMovimiento, {
        idVariante: linea.idVariante,
        idUbicacion: linea.idUbicacion,
        cantidad: cantidadReversa,
        costoUnitario: linea.costoUnitario,
        precioUnitario: linea.precioUnitario,
      });
      await stockRepository.aumentarExistencia(client, linea.idVariante, linea.idUbicacion, cantidadReversa);
    }

    // Reversa de fiado (remito intacto).
    if (remito) {
      await ventasRepository.anularRemito(client, remito.idRemito);
      await ventasRepository.restarSaldoCliente(client, remito.idCliente, remito.montoTotal);
    }

    // Marcar la venta como anulada.
    await ventasRepository.marcarVentaAnulada(client, idVenta, datos.idUsuario, datos.motivo);
  });

  return obtenerVenta(idVenta);
}