import { query } from '../../config/db.js';

function construirFiltros({ idVariante, idUbicacion, tipoMovimiento, desde, hasta }) {
  const condiciones = [];
  const params = [];

  if (idVariante) {
    params.push(idVariante);
    condiciones.push(`msd.id_variante = $${params.length}`);
  }
  if (idUbicacion) {
    params.push(idUbicacion);
    condiciones.push(`msd.id_ubicacion = $${params.length}`);
  }
  if (tipoMovimiento) {
    params.push(tipoMovimiento);
    condiciones.push(`ms.tipo_movimiento = $${params.length}`);
  }
  if (desde) {
    params.push(desde);
    condiciones.push(`(ms.fecha AT TIME ZONE 'America/Argentina/Buenos_Aires') >= $${params.length}::date`);
  }
  if (hasta) {
    params.push(hasta);
    condiciones.push(`(ms.fecha AT TIME ZONE 'America/Argentina/Buenos_Aires') < ($${params.length}::date + 1)`);
  }

  const clausula = condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : '';
  return { clausula, params };
}

export async function listarMovimientos({ idVariante, idUbicacion, tipoMovimiento, desde, hasta, limite, offset }) {
  const { clausula, params } = construirFiltros({ idVariante, idUbicacion, tipoMovimiento, desde, hasta });
  const pLimite = params.length + 1;
  const pOffset = params.length + 2;

  const sql = `
    SELECT
      msd.id_detalle          AS "idDetalle",
      ms.id_movimiento_stock  AS "idMovimiento",
      ms.fecha                AS "fecha",
      ms.tipo_movimiento      AS "tipoMovimiento",
      ms.observacion          AS "observacion",
      ms.id_venta             AS "idVenta",
      ms.id_reposicion        AS "idReposicion",
      u.id_usuario            AS "idUsuario",
      u.nombre                AS "usuario",
      v.id_variante           AS "idVariante",
      v.descripcion_completa  AS "variante",
      p.descripcion_base      AS "producto",
      ub.id_ubicacion         AS "idUbicacion",
      ub.nombre               AS "ubicacion",
      msd.cantidad::float     AS "cantidad",
      msd.costo_unitario::float  AS "costoUnitario",
      msd.precio_unitario::float AS "precioUnitario"
    FROM movimiento_stock_detalle msd
    JOIN movimiento_stock ms      ON ms.id_movimiento_stock = msd.id_movimiento_stock
    JOIN usuario u                ON u.id_usuario = ms.id_usuario
    JOIN producto_variante v      ON v.id_variante = msd.id_variante
    JOIN producto p                ON p.id_producto = v.id_producto
    JOIN ubicacion ub             ON ub.id_ubicacion = msd.id_ubicacion
    ${clausula}
    ORDER BY ms.fecha DESC, msd.id_detalle DESC
    LIMIT $${pLimite} OFFSET $${pOffset}
  `;
  const { rows } = await query(sql, [...params, limite, offset]);
  return rows;
}

export async function contarMovimientos(filtros) {
  const { clausula, params } = construirFiltros(filtros);
  const sql = `
    SELECT COUNT(*)::int AS total
    FROM movimiento_stock_detalle msd
    JOIN movimiento_stock ms ON ms.id_movimiento_stock = msd.id_movimiento_stock
    ${clausula}
  `;
  const { rows } = await query(sql, params);
  return rows[0].total;
}