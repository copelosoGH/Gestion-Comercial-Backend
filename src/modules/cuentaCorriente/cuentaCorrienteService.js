import { ApiError } from '../../utils/apiError.js';
import { withTransaction } from '../../config/db.js';
import * as cuentaCorrienteRepository from './cuentaCorrienteRepository.js';

// Trabajamos en centavos para evitar errores de punto flotante.
const aCentavos = (n) => Math.round(Number(n) * 100);
const aPesos = (c) => c / 100;

/**
 * Registra un pago de cuenta corriente e imputa FIFO contra los remitos
 * pendientes del cliente (del más viejo al más nuevo). Sin sobrepago.
 *
 * Ejemplo: remito A ($50, viejo) + remito B ($50), paga $75:
 *   A -> PAGADO ($50), B -> PARCIAL (saldo $25).
 */
export async function registrarPago(datos) {
  const idPago = await withTransaction(async (client) => {
    if (!(await cuentaCorrienteRepository.existeUsuario(client, datos.idUsuario))) {
      throw ApiError.badRequest('El usuario indicado no existe.');
    }
    if (!(await cuentaCorrienteRepository.existeClienteActivo(client, datos.idCliente))) {
      throw ApiError.badRequest('El cliente indicado no existe o está inactivo.');
    }

    // Lockeamos los remitos pendientes (serializa pagos simultáneos del cliente).
    const remitos = await cuentaCorrienteRepository.bloquearRemitosPendientes(client, datos.idCliente);

    const deudaTotal = remitos.reduce((acc, r) => acc + aCentavos(r.saldoPendiente), 0);
    let restante = aCentavos(datos.monto);

    if (deudaTotal === 0) {
      throw ApiError.badRequest('El cliente no tiene deuda pendiente.');
    }
    if (restante > deudaTotal) {
      throw ApiError.badRequest('El pago supera la deuda del cliente.', {
        deudaTotal: aPesos(deudaTotal),
        montoPago: datos.monto,
      });
    }

    // Cabecera del pago.
    const nuevoIdPago = await cuentaCorrienteRepository.insertarPago(client, {
      idCliente: datos.idCliente,
      idUsuario: datos.idUsuario,
      monto: datos.monto,
      medioPago: datos.medioPago,
      observacion: datos.observacion,
    });

    // Imputación FIFO.
    for (const remito of remitos) {
      if (restante === 0) break;
      const saldoRemito = aCentavos(remito.saldoPendiente);
      const aplicado = Math.min(restante, saldoRemito);

      await cuentaCorrienteRepository.insertarAplicacion(client, nuevoIdPago, remito.idRemito, aPesos(aplicado));

      const nuevoSaldo = saldoRemito - aplicado;
      const estado = nuevoSaldo === 0 ? 'PAGADO' : 'PARCIAL';
      await cuentaCorrienteRepository.actualizarRemito(client, remito.idRemito, aPesos(nuevoSaldo), estado);

      restante -= aplicado;
    }

    // Bajar el saldo del cliente por el total pagado.
    await cuentaCorrienteRepository.restarSaldoCliente(client, datos.idCliente, datos.monto);

    return nuevoIdPago;
  });

  return obtenerPago(idPago);
}

/** Recibo de un pago: cabecera + cómo se repartió entre remitos. */
export async function obtenerPago(idPago) {
  const pago = await cuentaCorrienteRepository.obtenerPagoPorId(idPago);
  if (!pago) {
    throw ApiError.notFound('Pago no encontrado');
  }
  pago.aplicaciones = await cuentaCorrienteRepository.obtenerAplicacionesDePago(idPago);
  return pago;
}

/** Estado de cuenta de un cliente: saldo + remitos pendientes + pagos recientes. */
export async function obtenerEstadoCuenta(idCliente) {
  const cliente = await cuentaCorrienteRepository.obtenerClientePorId(idCliente);
  if (!cliente) {
    throw ApiError.notFound('Cliente no encontrado');
  }
  const [remitosPendientes, pagosRecientes] = await Promise.all([
    cuentaCorrienteRepository.obtenerRemitosPendientes(idCliente),
    cuentaCorrienteRepository.obtenerPagosRecientes(idCliente),
  ]);
  return { cliente, remitosPendientes, pagosRecientes };
}

/** Lista de clientes con deuda. */
export async function listarDeudores() {
  return cuentaCorrienteRepository.listarDeudores();
}