import { query } from '../../config/db.js';

// =====================================================================
//  LECTURAS
// =====================================================================

export async function obtenerClientePorId(idCliente) {
  const { rows } = await query(
    `SELECT
       id_cliente AS "idCliente",
       nombre     AS "nombre",
       dni_cuit   AS "dniCuit",
       telefono   AS "telefono",
       saldo_cuenta_corriente::float AS "saldo"
     FROM cliente
     WHERE id_cliente = $1`,
    [idCliente],
  );
  return rows[0] ?? null;
}

/** Remitos con saldo pendiente (PENDIENTE o PARCIAL), del más viejo al más nuevo. */
export async function obtenerRemitosPendientes(idCliente) {
  const { rows } = await query(
    `SELECT
       id_remito       AS "idRemito",
       id_venta        AS "idVenta",
       numero_remito   AS "numeroRemito",
       fecha           AS "fecha",
       monto_total::float    AS "montoTotal",
       saldo_pendiente::float AS "saldoPendiente",
       estado          AS "estado"
     FROM cc_remito
     WHERE id_cliente = $1 AND estado IN ('PENDIENTE','PARCIAL')
     ORDER BY fecha ASC, id_remito ASC`,
    [idCliente],
  );
  return rows;
}

export async function obtenerPagosRecientes(idCliente, limite = 10) {
  const { rows } = await query(
    `SELECT
       id_pago    AS "idPago",
       fecha      AS "fecha",
       monto::float AS "monto",
       medio_pago AS "medioPago"
     FROM cc_pago
     WHERE id_cliente = $1
     ORDER BY fecha DESC, id_pago DESC
     LIMIT $2`,
    [idCliente, limite],
  );
  return rows;
}

export async function obtenerPagoPorId(idPago) {
  const { rows } = await query(
    `SELECT
       pg.id_pago    AS "idPago",
       pg.fecha      AS "fecha",
       pg.monto::float AS "monto",
       pg.medio_pago AS "medioPago",
       pg.observacion AS "observacion",
       pg.id_cliente AS "idCliente",
       c.nombre      AS "cliente",
       pg.id_usuario AS "idUsuario",
       u.nombre      AS "usuario"
     FROM cc_pago pg
     JOIN cliente c ON c.id_cliente = pg.id_cliente
     JOIN usuario u ON u.id_usuario = pg.id_usuario
     WHERE pg.id_pago = $1`,
    [idPago],
  );
  return rows[0] ?? null;
}

/** Cómo se repartió un pago entre los remitos (recibo). */
export async function obtenerAplicacionesDePago(idPago) {
  const { rows } = await query(
    `SELECT
       ap.id_remito       AS "idRemito",
       r.numero_remito    AS "numeroRemito",
       ap.monto_aplicado::float AS "montoAplicado",
       r.saldo_pendiente::float AS "saldoPendiente",
       r.estado           AS "estado"
     FROM cc_pago_aplicacion ap
     JOIN cc_remito r ON r.id_remito = ap.id_remito
     WHERE ap.id_pago = $1
     ORDER BY r.fecha ASC, r.id_remito ASC`,
    [idPago],
  );
  return rows;
}

/** Clientes con deuda (saldo > 0). */
export async function listarDeudores() {
  const { rows } = await query(
    `SELECT
       id_cliente AS "idCliente",
       nombre     AS "nombre",
       telefono   AS "telefono",
       saldo_cuenta_corriente::float AS "saldo"
     FROM cliente
     WHERE activo AND saldo_cuenta_corriente > 0
     ORDER BY saldo_cuenta_corriente DESC`,
  );
  return rows;
}

// =====================================================================
//  ESCRITURAS (dentro de transacción)
// =====================================================================

export async function existeUsuario(client, idUsuario) {
  const { rows } = await client.query(
    'SELECT 1 FROM usuario WHERE id_usuario = $1 AND activo',
    [idUsuario],
  );
  return rows.length > 0;
}

export async function existeClienteActivo(client, idCliente) {
  const { rows } = await client.query(
    'SELECT 1 FROM cliente WHERE id_cliente = $1 AND activo',
    [idCliente],
  );
  return rows.length > 0;
}

/** Bloquea (FOR UPDATE) los remitos pendientes del cliente, del más viejo al más nuevo. */
export async function bloquearRemitosPendientes(client, idCliente) {
  const { rows } = await client.query(
    `SELECT
       id_remito       AS "idRemito",
       monto_total::float    AS "montoTotal",
       saldo_pendiente::float AS "saldoPendiente"
     FROM cc_remito
     WHERE id_cliente = $1 AND estado IN ('PENDIENTE','PARCIAL')
     ORDER BY fecha ASC, id_remito ASC
     FOR UPDATE`,
    [idCliente],
  );
  return rows;
}

export async function insertarPago(client, { idCliente, idUsuario, monto, medioPago, observacion }) {
  const { rows } = await client.query(
    `INSERT INTO cc_pago (id_cliente, id_usuario, monto, medio_pago, observacion)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id_pago AS "idPago"`,
    [idCliente, idUsuario, monto, medioPago, observacion],
  );
  return rows[0].idPago;
}

export async function insertarAplicacion(client, idPago, idRemito, montoAplicado) {
  await client.query(
    `INSERT INTO cc_pago_aplicacion (id_pago, id_remito, monto_aplicado)
     VALUES ($1, $2, $3)`,
    [idPago, idRemito, montoAplicado],
  );
}

export async function actualizarRemito(client, idRemito, nuevoSaldo, estado) {
  await client.query(
    `UPDATE cc_remito SET saldo_pendiente = $2, estado = $3 WHERE id_remito = $1`,
    [idRemito, nuevoSaldo, estado],
  );
}

export async function restarSaldoCliente(client, idCliente, monto) {
  await client.query(
    `UPDATE cliente
       SET saldo_cuenta_corriente = saldo_cuenta_corriente - $2
     WHERE id_cliente = $1`,
    [idCliente, monto],
  );
}