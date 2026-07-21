import { query } from '../../config/db.js';

/**
 * Productos más vendidos en un rango de fechas (excluye ventas anuladas).
 * Devuelve cantidad vendida y monto vendido por variante.
 */
export async function masVendidos({ desde, hasta, limite }) {
  const condiciones = ['ve.anulada = FALSE'];
  const params = [];
  if (desde) {
    params.push(desde);
    condiciones.push(`ve.fecha >= $${params.length}::date`);
  }
  if (hasta) {
    params.push(hasta);
    condiciones.push(`ve.fecha < ($${params.length}::date + 1)`);
  }
  params.push(limite);
  const pLimite = params.length;

  const sql = `
    SELECT
      v.id_variante          AS "idVariante",
      p.descripcion_base     AS "producto",
      v.descripcion_completa AS "descripcion",
      r.nombre               AS "rubro",
      SUM(vd.cantidad)::float AS "cantidadVendida",
      SUM(vd.subtotal)::float AS "montoVendido"
    FROM venta_detalle vd
    JOIN venta ve            ON ve.id_venta = vd.id_venta
    JOIN producto_variante v ON v.id_variante = vd.id_variante
    JOIN producto p          ON p.id_producto = v.id_producto
    JOIN rubro r             ON r.id_rubro = p.id_rubro
    WHERE ${condiciones.join(' AND ')}
    GROUP BY v.id_variante, p.descripcion_base, v.descripcion_completa, r.nombre
    ORDER BY SUM(vd.cantidad) DESC
    LIMIT $${pLimite}
  `;
  const { rows } = await query(sql, params);
  return rows;
}

/** Márgenes: costo, precio de venta, ganancia unitaria y % por variante. */
export async function margenes({ busqueda, idRubro }) {
  const condiciones = ['v.activo'];
  const params = [];
  if (idRubro) {
    params.push(idRubro);
    condiciones.push(`p.id_rubro = $${params.length}`);
  }
  if (busqueda) {
    params.push(`%${busqueda}%`);
    const i = params.length;
    condiciones.push(`(v.descripcion_completa ILIKE $${i} OR p.descripcion_base ILIKE $${i})`);
  }

  const sql = `
    SELECT
      v.id_variante          AS "idVariante",
      p.descripcion_base     AS "producto",
      v.descripcion_completa AS "descripcion",
      r.nombre               AS "rubro",
      v.precio_costo::float   AS "precioCosto",
      v.precio_venta::float   AS "precioVenta",
      (v.precio_venta - v.precio_costo)::float AS "gananciaUnitaria",
      CASE WHEN v.precio_venta > 0
           THEN ROUND(((v.precio_venta - v.precio_costo) / v.precio_venta * 100)::numeric, 2)::float
           ELSE NULL END     AS "margenPorcentaje"
    FROM producto_variante v
    JOIN producto p ON p.id_producto = v.id_producto
    JOIN rubro r    ON r.id_rubro = p.id_rubro
    WHERE ${condiciones.join(' AND ')}
    ORDER BY p.descripcion_base, v.id_variante
  `;
  const { rows } = await query(sql, params);
  return rows;
}

/**
 * Reporte de stock actual: existencias por variante con columnas fijas
 * Local / Depósito / Total + valuación del inventario (total x costo).
 */
export async function stockActual({ busqueda, idRubro }) {
  const condiciones = ['v.activo'];
  const params = [];
  if (idRubro) {
    params.push(idRubro);
    condiciones.push(`p.id_rubro = $${params.length}`);
  }
  if (busqueda) {
    params.push(`%${busqueda}%`);
    const i = params.length;
    condiciones.push(`(v.descripcion_completa ILIKE $${i} OR p.descripcion_base ILIKE $${i} OR v.codigo_barras ILIKE $${i})`);
  }

  const sql = `
    SELECT
      v.id_variante          AS "idVariante",
      v.codigo_barras        AS "codigoBarras",
      p.descripcion_base     AS "producto",
      v.descripcion_completa AS "descripcion",
      r.nombre               AS "rubro",
      COALESCE(SUM(CASE WHEN u.nombre = 'Local'    THEN e.cantidad END), 0)::float AS "stockLocal",
      COALESCE(SUM(CASE WHEN u.nombre = 'Depósito' THEN e.cantidad END), 0)::float AS "stockDeposito",
      COALESCE(SUM(e.cantidad), 0)::float AS "stockTotal",
      v.precio_costo::float  AS "precioCosto",
      (COALESCE(SUM(e.cantidad), 0) * v.precio_costo)::float AS "valorStock"
    FROM producto_variante v
    JOIN producto p  ON p.id_producto = v.id_producto
    JOIN rubro r     ON r.id_rubro = p.id_rubro
    LEFT JOIN existencia e ON e.id_variante = v.id_variante
    LEFT JOIN ubicacion u  ON u.id_ubicacion = e.id_ubicacion
    WHERE ${condiciones.join(' AND ')}
    GROUP BY v.id_variante, v.codigo_barras, p.descripcion_base,
             v.descripcion_completa, r.nombre, v.precio_costo
    ORDER BY p.descripcion_base, v.id_variante
  `;
  const { rows } = await query(sql, params);
  return rows;
}

/**
 * Resumen de caja: cantidad de ventas, total facturado, promedio por venta
 * y ganancia (usando el costo real registrado en el movimiento de esa venta,
 * no el costo actual del producto). Excluye ventas anuladas.
 */
export async function resumenVentas({ desde, hasta }) {
  const condiciones = ['ve.anulada = FALSE'];
  const params = [];
  if (desde) {
    params.push(desde);
    condiciones.push(`(ve.fecha AT TIME ZONE 'America/Argentina/Buenos_Aires') >= $${params.length}::date`);
  }
  if (hasta) {
    params.push(hasta);
    condiciones.push(`(ve.fecha AT TIME ZONE 'America/Argentina/Buenos_Aires') < ($${params.length}::date + 1)`);
  }

  const sql = `
    SELECT
      COUNT(DISTINCT ve.id_venta)::int AS "cantidadVentas",
      COALESCE(SUM(vd.subtotal), 0)::float AS "totalVentas",
      CASE WHEN COUNT(DISTINCT ve.id_venta) = 0 THEN 0
           ELSE ROUND((SUM(vd.subtotal) / COUNT(DISTINCT ve.id_venta))::numeric, 2)::float
      END AS "promedioVenta",
      COALESCE(SUM(vd.subtotal) - SUM(vd.cantidad * msd.costo_unitario), 0)::float AS "ganancia"
    FROM venta ve
    JOIN venta_detalle vd          ON vd.id_venta = ve.id_venta
    JOIN movimiento_stock ms       ON ms.id_venta = ve.id_venta AND ms.tipo_movimiento = 'VENTA'
    JOIN movimiento_stock_detalle msd
      ON msd.id_movimiento_stock = ms.id_movimiento_stock AND msd.id_variante = vd.id_variante
    WHERE ${condiciones.join(' AND ')}
  `;
  const { rows } = await query(sql, params);
  return rows[0];
}

/** Ventas agrupadas por medio de pago (efectivo, débito, cta cte, etc). */
export async function ventasPorMetodo({ desde, hasta }) {
  const condiciones = ['ve.anulada = FALSE'];
  const params = [];
  if (desde) {
    params.push(desde);
    condiciones.push(`(ve.fecha AT TIME ZONE 'America/Argentina/Buenos_Aires') >= $${params.length}::date`);
  }
  if (hasta) {
    params.push(hasta);
    condiciones.push(`(ve.fecha AT TIME ZONE 'America/Argentina/Buenos_Aires') < ($${params.length}::date + 1)`);
  }

  const sql = `
    SELECT
      vp.medio_pago       AS "medioPago",
      COUNT(*)::int       AS "cantidadPagos",
      SUM(vp.monto)::float AS "monto"
    FROM venta_pago vp
    JOIN venta ve ON ve.id_venta = vp.id_venta
    WHERE ${condiciones.join(' AND ')}
    GROUP BY vp.medio_pago
    ORDER BY SUM(vp.monto) DESC
  `;
  const { rows } = await query(sql, params);
  return rows;
}