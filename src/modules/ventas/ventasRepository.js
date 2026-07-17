import { query } from '../../config/db.js';

// =====================================================================
//  LECTURAS (fuera de transacción, usan el pool)
// =====================================================================

export async function obtenerVentaPorId(idVenta) {
  const sql = `
    SELECT
      ve.id_venta      AS "idVenta",
      ve.fecha         AS "fecha",
      ve.total::float  AS "total",
      ve.observacion   AS "observacion",
      ve.anulada          AS "anulada",
      ve.fecha_anulacion  AS "fechaAnulacion",
      ve.motivo_anulacion AS "motivoAnulacion",
      ve.id_usuario    AS "idUsuario",
      u.nombre         AS "usuario",
      ve.id_cliente    AS "idCliente",
      c.nombre         AS "cliente"
    FROM venta ve
    JOIN usuario u ON u.id_usuario = ve.id_usuario
    LEFT JOIN cliente c ON c.id_cliente = ve.id_cliente
    WHERE ve.id_venta = $1
  `;
  const { rows } = await query(sql, [idVenta]);
  return rows[0] ?? null;
}

export async function obtenerDetalleVenta(idVenta) {
  const sql = `
    SELECT
      d.id_variante          AS "idVariante",
      v.descripcion_completa AS "descripcion",
      d.cantidad::float      AS "cantidad",
      d.precio_unitario::float AS "precioUnitario",
      d.subtotal::float      AS "subtotal"
    FROM venta_detalle d
    JOIN producto_variante v ON v.id_variante = d.id_variante
    WHERE d.id_venta = $1
    ORDER BY d.id_venta_detalle
  `;
  const { rows } = await query(sql, [idVenta]);
  return rows;
}

export async function obtenerPagosVenta(idVenta) {
  const sql = `
    SELECT medio_pago AS "medioPago", monto::float AS "monto"
    FROM venta_pago
    WHERE id_venta = $1
    ORDER BY id_venta_pago
  `;
  const { rows } = await query(sql, [idVenta]);
  return rows;
}

// =====================================================================
//  VERIFICACIONES / RESOLUCIONES (dentro de transacción, usan client)
// =====================================================================

export async function existeClienteActivo(client, idCliente) {
  const { rows } = await client.query(
    'SELECT 1 FROM cliente WHERE id_cliente = $1 AND activo',
    [idCliente],
  );
  return rows.length > 0;
}

/** Trae la variante activa con su precio de venta y costo actuales. */
export async function obtenerVarianteParaVenta(client, idVariante) {
  const { rows } = await client.query(
    `SELECT
       v.id_variante          AS "idVariante",
       v.descripcion_completa AS "descripcion",
       v.precio_venta::float  AS "precioVenta",
       v.precio_costo::float  AS "precioCosto"
     FROM producto_variante v
     WHERE v.id_variante = $1 AND v.activo`,
    [idVariante],
  );
  return rows[0] ?? null;
}

// =====================================================================
//  ESCRITURAS (dentro de transacción)
// =====================================================================

export async function insertarVenta(client, { idUsuario, idCliente, total, observacion }) {
  const { rows } = await client.query(
    `INSERT INTO venta (id_usuario, id_cliente, total, observacion)
     VALUES ($1, $2, $3, $4)
     RETURNING id_venta AS "idVenta", fecha, total::float AS "total"`,
    [idUsuario, idCliente, total, observacion],
  );
  return rows[0];
}

export async function insertarVentaDetalle(client, idVenta, linea) {
  await client.query(
    `INSERT INTO venta_detalle (id_venta, id_variante, cantidad, precio_unitario)
     VALUES ($1, $2, $3, $4)`,
    [idVenta, linea.idVariante, linea.cantidad, linea.precioUnitario],
  );
}

export async function insertarVentaPago(client, idVenta, pago) {
  await client.query(
    `INSERT INTO venta_pago (id_venta, medio_pago, monto)
     VALUES ($1, $2, $3)`,
    [idVenta, pago.medioPago, pago.monto],
  );
}

export async function crearRemito(client, { idCliente, idVenta, numeroRemito, monto }) {
  const { rows } = await client.query(
    `INSERT INTO cc_remito
       (id_cliente, id_venta, numero_remito, monto_total, saldo_pendiente, estado)
     VALUES ($1, $2, $3, $4, $4, 'PENDIENTE')
     RETURNING id_remito AS "idRemito"`,
    [idCliente, idVenta, numeroRemito, monto],
  );
  return rows[0].idRemito;
}

export async function sumarSaldoCliente(client, idCliente, monto) {
  await client.query(
    `UPDATE cliente
       SET saldo_cuenta_corriente = saldo_cuenta_corriente + $2
     WHERE id_cliente = $1`,
    [idCliente, monto],
  );
}

// =====================================================================
//  LISTADO DE VENTAS
// =====================================================================

function construirFiltrosVentas({ desde, hasta, idUsuario, idCliente, incluirAnuladas }) {
  const condiciones = [];
  const params = [];

  if (desde) {
    params.push(desde);
    condiciones.push(`(ve.fecha AT TIME ZONE 'America/Argentina/Buenos_Aires') >= $${params.length}::date`);
  }
  if (hasta) {
    params.push(hasta);
    condiciones.push(`(ve.fecha AT TIME ZONE 'America/Argentina/Buenos_Aires') < ($${params.length}::date + 1)`);
  }
  if (idUsuario) {
    params.push(idUsuario);
    condiciones.push(`ve.id_usuario = $${params.length}`);
  }
  if (idCliente) {
    params.push(idCliente);
    condiciones.push(`ve.id_cliente = $${params.length}`);
  }
  if (!incluirAnuladas) {
    condiciones.push('ve.anulada = FALSE');
  }

  const clausula = condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : '';
  return { clausula, params };
}

export async function listarVentas({ desde, hasta, idUsuario, idCliente, incluirAnuladas, limite, offset }) {
  const { clausula, params } = construirFiltrosVentas({ desde, hasta, idUsuario, idCliente, incluirAnuladas });
  const pLimite = params.length + 1;
  const pOffset = params.length + 2;

  const sql = `
    SELECT
      ve.id_venta     AS "idVenta",
      ve.fecha        AS "fecha",
      ve.total::float AS "total",
      ve.anulada      AS "anulada",
      ve.id_usuario   AS "idUsuario",
      u.nombre        AS "usuario",
      ve.id_cliente   AS "idCliente",
      c.nombre        AS "cliente"
    FROM venta ve
    JOIN usuario u ON u.id_usuario = ve.id_usuario
    LEFT JOIN cliente c ON c.id_cliente = ve.id_cliente
    ${clausula}
    ORDER BY ve.fecha DESC, ve.id_venta DESC
    LIMIT $${pLimite} OFFSET $${pOffset}
  `;
  const { rows } = await query(sql, [...params, limite, offset]);
  return rows;
}

export async function contarVentas(filtros) {
  const { clausula, params } = construirFiltrosVentas(filtros);
  const sql = `SELECT COUNT(*)::int AS total FROM venta ve ${clausula}`;
  const { rows } = await query(sql, params);
  return rows[0].total;
}

// =====================================================================
//  ANULACIÓN DE VENTAS (dentro de transacción)
// =====================================================================

/** Bloquea la venta y devuelve si ya está anulada. */
export async function bloquearVenta(client, idVenta) {
  const { rows } = await client.query(
    'SELECT id_venta AS "idVenta", anulada AS "anulada" FROM venta WHERE id_venta = $1 FOR UPDATE',
    [idVenta],
  );
  return rows[0] ?? null;
}

/** Trae las líneas del movimiento de stock original (tipo VENTA) de esa venta. */
export async function obtenerLineasMovimientoVenta(client, idVenta) {
  const { rows } = await client.query(
    `SELECT
       msd.id_variante         AS "idVariante",
       msd.id_ubicacion        AS "idUbicacion",
       msd.cantidad::float     AS "cantidad",
       msd.costo_unitario::float  AS "costoUnitario",
       msd.precio_unitario::float AS "precioUnitario"
     FROM movimiento_stock ms
     JOIN movimiento_stock_detalle msd ON msd.id_movimiento_stock = ms.id_movimiento_stock
     WHERE ms.id_venta = $1 AND ms.tipo_movimiento = 'VENTA'`,
    [idVenta],
  );
  return rows;
}

/** Trae el remito de cuenta corriente asociado a la venta (si lo hay). */
export async function obtenerRemitoDeVenta(client, idVenta) {
  const { rows } = await client.query(
    `SELECT
       id_remito             AS "idRemito",
       id_cliente            AS "idCliente",
       monto_total::float    AS "montoTotal",
       saldo_pendiente::float AS "saldoPendiente",
       estado                AS "estado"
     FROM cc_remito
     WHERE id_venta = $1`,
    [idVenta],
  );
  return rows[0] ?? null;
}

export async function anularRemito(client, idRemito) {
  await client.query(
    `UPDATE cc_remito SET estado = 'ANULADO', saldo_pendiente = 0 WHERE id_remito = $1`,
    [idRemito],
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

export async function marcarVentaAnulada(client, idVenta, idUsuario, motivo) {
  await client.query(
    `UPDATE venta
       SET anulada = TRUE,
           fecha_anulacion = now(),
           id_usuario_anulacion = $2,
           motivo_anulacion = $3
     WHERE id_venta = $1`,
    [idVenta, idUsuario, motivo],
  );
}