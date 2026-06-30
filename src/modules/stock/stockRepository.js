import { query } from '../../config/db.js';

// =====================================================================
//  Lectura usada dentro de transacción
// =====================================================================

/** Variante activa con su costo actual (para valuar ajustes/mermas). */
export async function obtenerVarianteParaMovimiento(client, idVariante) {
  const { rows } = await client.query(
    `SELECT id_variante AS "idVariante", precio_costo::float AS "precioCosto"
     FROM producto_variante
     WHERE id_variante = $1 AND activo`,
    [idVariante],
  );
  return rows[0] ?? null;
}

// =====================================================================
//  Alertas de mínimos (RF10 / RF11)
// =====================================================================

/**
 * Alerta de REPOSICIÓN: stock total (todas las ubicaciones) por debajo o
 * igual al mínimo de reposición de la variante. "Hay que comprarle al proveedor".
 */
export async function alertasReposicion() {
  const sql = `
    SELECT
      v.id_variante               AS "idVariante",
      v.descripcion_completa      AS "descripcion",
      p.descripcion_base          AS "producto",
      v.stock_minimo_total::float AS "stockMinimoTotal",
      COALESCE(SUM(e.cantidad), 0)::float AS "stockTotal"
    FROM producto_variante v
    JOIN producto p ON p.id_producto = v.id_producto
    LEFT JOIN existencia e ON e.id_variante = v.id_variante
    WHERE v.activo AND v.stock_minimo_total > 0
    GROUP BY v.id_variante, v.descripcion_completa, p.descripcion_base, v.stock_minimo_total
    HAVING COALESCE(SUM(e.cantidad), 0) <= v.stock_minimo_total
    ORDER BY (v.stock_minimo_total - COALESCE(SUM(e.cantidad), 0)) DESC
  `;
  const { rows } = await query(sql);
  return rows;
}

/**
 * Alerta de GÓNDOLA: el Local está por debajo o igual a su mínimo, pero hay
 * stock en el Depósito. "Hay que traer del depósito, no comprar".
 */
export async function alertasGondola() {
  const sql = `
    SELECT
      v.id_variante           AS "idVariante",
      v.descripcion_completa  AS "descripcion",
      p.descripcion_base      AS "producto",
      eLocal.cantidad::float     AS "stockLocal",
      eLocal.stock_minimo::float AS "minimoLocal",
      COALESCE(eDep.cantidad, 0)::float AS "stockDeposito"
    FROM existencia eLocal
    JOIN ubicacion uLocal ON uLocal.id_ubicacion = eLocal.id_ubicacion AND uLocal.nombre = 'Local'
    JOIN producto_variante v ON v.id_variante = eLocal.id_variante AND v.activo
    JOIN producto p ON p.id_producto = v.id_producto
    LEFT JOIN existencia eDep ON eDep.id_variante = v.id_variante
      AND eDep.id_ubicacion = (SELECT id_ubicacion FROM ubicacion WHERE nombre = 'Depósito')
    WHERE eLocal.stock_minimo > 0
      AND eLocal.cantidad <= eLocal.stock_minimo
      AND COALESCE(eDep.cantidad, 0) > 0
    ORDER BY (eLocal.stock_minimo - eLocal.cantidad) DESC
  `;
  const { rows } = await query(sql);
  return rows;
}


// =====================================================================
//  Primitivas de stock compartidas entre módulos (ventas, reposición,
//  ajustes, transferencias). Todas operan DENTRO de una transacción
//  (reciben el `client`), porque tocan el inventario.
//
//  Regla de oro: el stock SOLO cambia generando movimientos en el libro
//  mayor (movimiento_stock / movimiento_stock_detalle) y actualizando el
//  cache de existencia en la misma transacción.
// =====================================================================

export async function existeUsuario(client, idUsuario) {
  const { rows } = await client.query(
    'SELECT 1 FROM usuario WHERE id_usuario = $1 AND activo',
    [idUsuario],
  );
  return rows.length > 0;
}

export async function obtenerIdUbicacionPorNombre(client, nombre) {
  const { rows } = await client.query(
    'SELECT id_ubicacion FROM ubicacion WHERE nombre = $1 AND activo',
    [nombre],
  );
  return rows[0]?.id_ubicacion ?? null;
}

export async function obtenerIdUbicacionPorId(client, idUbicacion) {
  const { rows } = await client.query(
    'SELECT id_ubicacion FROM ubicacion WHERE id_ubicacion = $1 AND activo',
    [idUbicacion],
  );
  return rows[0]?.id_ubicacion ?? null;
}

/** Crea la fila de existencia en 0 si no existe (para poder lockearla/actualizarla). */
export async function asegurarExistencia(client, idVariante, idUbicacion) {
  await client.query(
    `INSERT INTO existencia (id_variante, id_ubicacion, cantidad)
     VALUES ($1, $2, 0)
     ON CONFLICT (id_variante, id_ubicacion) DO NOTHING`,
    [idVariante, idUbicacion],
  );
}

/** Bloquea (FOR UPDATE) la existencia y devuelve la cantidad disponible. */
export async function bloquearExistencia(client, idVariante, idUbicacion) {
  const { rows } = await client.query(
    `SELECT cantidad::float AS cantidad
     FROM existencia
     WHERE id_variante = $1 AND id_ubicacion = $2
     FOR UPDATE`,
    [idVariante, idUbicacion],
  );
  return rows[0]?.cantidad ?? 0;
}

export async function aumentarExistencia(client, idVariante, idUbicacion, cantidad) {
  await client.query(
    `UPDATE existencia SET cantidad = cantidad + $3
     WHERE id_variante = $1 AND id_ubicacion = $2`,
    [idVariante, idUbicacion, cantidad],
  );
}

export async function descontarExistencia(client, idVariante, idUbicacion, cantidad) {
  await client.query(
    `UPDATE existencia SET cantidad = cantidad - $3
     WHERE id_variante = $1 AND id_ubicacion = $2`,
    [idVariante, idUbicacion, cantidad],
  );
}

/** Fija la existencia a un valor absoluto (usado por el ajuste por conteo). */
export async function establecerExistencia(client, idVariante, idUbicacion, cantidad) {
  await client.query(
    `UPDATE existencia SET cantidad = $3
     WHERE id_variante = $1 AND id_ubicacion = $2`,
    [idVariante, idUbicacion, cantidad],
  );
}

/**
 * Inserta la cabecera de un movimiento de stock.
 * tipo: COMPRA | VENTA | AJUSTE | ROTURA | PERDIDA | CONSUMO_INTERNO |
 *       TRANSFERENCIA | ANULACION_VENTA
 * idVenta / idReposicion: referencia opcional al documento origen.
 */
export async function insertarMovimientoStock(client, { idUsuario, tipo, idVenta = null, idReposicion = null, observacion = null }) {
  const { rows } = await client.query(
    `INSERT INTO movimiento_stock (id_usuario, tipo_movimiento, id_venta, id_reposicion, observacion)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id_movimiento_stock AS "idMovimiento"`,
    [idUsuario, tipo, idVenta, idReposicion, observacion],
  );
  return rows[0].idMovimiento;
}

/** Inserta una línea del movimiento. cantidad: + ingreso / - egreso. */
export async function insertarMovimientoDetalle(client, idMovimiento, d) {
  await client.query(
    `INSERT INTO movimiento_stock_detalle
       (id_movimiento_stock, id_variante, id_ubicacion, cantidad, costo_unitario, precio_unitario)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [idMovimiento, d.idVariante, d.idUbicacion, d.cantidad, d.costoUnitario ?? null, d.precioUnitario ?? null],
  );
}

