import { query } from '../../config/db.js';

// =====================================================================
//  LECTURAS
// =====================================================================

export async function obtenerReposicionPorId(idReposicion) {
  const sql = `
    SELECT
      rp.id_reposicion  AS "idReposicion",
      rp.fecha          AS "fecha",
      rp.numero_factura AS "numeroFactura",
      rp.total::float   AS "total",
      rp.observacion    AS "observacion",
      rp.anulada          AS "anulada",
      rp.fecha_anulacion  AS "fechaAnulacion",
      rp.motivo_anulacion AS "motivoAnulacion",
      rp.id_proveedor   AS "idProveedor",
      pr.nombre         AS "proveedor",
      rp.id_ubicacion   AS "idUbicacion",
      ub.nombre         AS "ubicacion",
      rp.id_usuario     AS "idUsuario",
      u.nombre          AS "usuario"
    FROM reposicion rp
    JOIN proveedor pr ON pr.id_proveedor = rp.id_proveedor
    JOIN ubicacion ub ON ub.id_ubicacion = rp.id_ubicacion
    JOIN usuario u   ON u.id_usuario = rp.id_usuario
    WHERE rp.id_reposicion = $1
  `;
  const { rows } = await query(sql, [idReposicion]);
  return rows[0] ?? null;
}

export async function obtenerDetalleReposicion(idReposicion) {
  const sql = `
    SELECT
      d.id_variante               AS "idVariante",
      v.descripcion_completa      AS "descripcion",
      d.cantidad_cajas::float     AS "cantidadCajas",
      d.unidades_por_caja         AS "unidadesPorCaja",
      d.costo_unitario::float     AS "costoUnitario",
      d.cantidad_total_unidades::float AS "cantidadTotalUnidades",
      d.subtotal::float           AS "subtotal"
    FROM reposicion_detalle d
    JOIN producto_variante v ON v.id_variante = d.id_variante
    WHERE d.id_reposicion = $1
    ORDER BY d.id_reposicion_detalle
  `;
  const { rows } = await query(sql, [idReposicion]);
  return rows;
}

function construirFiltros({ desde, hasta, idProveedor, incluirAnuladas }) {
  const condiciones = [];
  const params = [];
  if (desde) {
    params.push(desde);
    condiciones.push(`rp.fecha >= $${params.length}::date`);
  }
  if (hasta) {
    params.push(hasta);
    condiciones.push(`rp.fecha < ($${params.length}::date + 1)`);
  }
  if (idProveedor) {
    params.push(idProveedor);
    condiciones.push(`rp.id_proveedor = $${params.length}`);
  }
  if (!incluirAnuladas) {
    condiciones.push('rp.anulada = FALSE');
  }
  const clausula = condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : '';
  return { clausula, params };
}

export async function listarReposiciones({ desde, hasta, idProveedor, incluirAnuladas, limite, offset }) {
  const { clausula, params } = construirFiltros({ desde, hasta, idProveedor, incluirAnuladas });
  const pLimite = params.length + 1;
  const pOffset = params.length + 2;
  const sql = `
    SELECT
      rp.id_reposicion  AS "idReposicion",
      rp.fecha          AS "fecha",
      rp.numero_factura AS "numeroFactura",
      rp.total::float   AS "total",
      rp.anulada        AS "anulada",
      rp.id_proveedor   AS "idProveedor",
      pr.nombre         AS "proveedor",
      rp.id_ubicacion   AS "idUbicacion",
      ub.nombre         AS "ubicacion"
    FROM reposicion rp
    JOIN proveedor pr ON pr.id_proveedor = rp.id_proveedor
    JOIN ubicacion ub ON ub.id_ubicacion = rp.id_ubicacion
    ${clausula}
    ORDER BY rp.fecha DESC, rp.id_reposicion DESC
    LIMIT $${pLimite} OFFSET $${pOffset}
  `;
  const { rows } = await query(sql, [...params, limite, offset]);
  return rows;
}

export async function contarReposiciones(filtros) {
  const { clausula, params } = construirFiltros(filtros);
  const sql = `SELECT COUNT(*)::int AS total FROM reposicion rp ${clausula}`;
  const { rows } = await query(sql, params);
  return rows[0].total;
}

// =====================================================================
//  ESCRITURAS (dentro de transacción)
// =====================================================================

export async function existeProveedorActivo(client, idProveedor) {
  const { rows } = await client.query(
    'SELECT 1 FROM proveedor WHERE id_proveedor = $1 AND activo',
    [idProveedor],
  );
  return rows.length > 0;
}

export async function existeVarianteActiva(client, idVariante) {
  const { rows } = await client.query(
    'SELECT 1 FROM producto_variante WHERE id_variante = $1 AND activo',
    [idVariante],
  );
  return rows.length > 0;
}

export async function insertarReposicion(client, datos) {
  const { rows } = await client.query(
    `INSERT INTO reposicion
       (id_proveedor, id_ubicacion, id_usuario, numero_factura, total, observacion, fecha)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::timestamptz, now()))
     RETURNING id_reposicion AS "idReposicion"`,
    [
      datos.idProveedor,
      datos.idUbicacion,
      datos.idUsuario,
      datos.numeroFactura,
      datos.total,
      datos.observacion,
      datos.fecha,
    ],
  );
  return rows[0];
}

export async function insertarReposicionDetalle(client, idReposicion, linea) {
  // cantidad_total_unidades y subtotal son columnas generadas: no se insertan.
  await client.query(
    `INSERT INTO reposicion_detalle
       (id_reposicion, id_variante, cantidad_cajas, unidades_por_caja, costo_unitario)
     VALUES ($1, $2, $3, $4, $5)`,
    [idReposicion, linea.idVariante, linea.cantidadCajas, linea.unidadesPorCaja, linea.costoUnitario],
  );
}

/** Actualiza el costo actual de la variante (último costo de compra). */
export async function actualizarCostoVariante(client, idVariante, costo) {
  await client.query(
    'UPDATE producto_variante SET precio_costo = $2 WHERE id_variante = $1',
    [idVariante, costo],
  );
}

/** Crea o actualiza el vínculo variante-proveedor con el costo de referencia. */
export async function upsertProductoProveedor(client, idVariante, idProveedor, precioCompra) {
  await client.query(
    `INSERT INTO producto_proveedor (id_variante, id_proveedor, precio_compra)
     VALUES ($1, $2, $3)
     ON CONFLICT (id_variante, id_proveedor)
       DO UPDATE SET precio_compra = EXCLUDED.precio_compra`,
    [idVariante, idProveedor, precioCompra],
  );
}

// =====================================================================
//  ANULACIÓN (dentro de transacción)
// =====================================================================

/** Bloquea la reposición y devuelve si ya está anulada. */
export async function bloquearReposicion(client, idReposicion) {
  const { rows } = await client.query(
    'SELECT id_reposicion AS "idReposicion", anulada AS "anulada" FROM reposicion WHERE id_reposicion = $1 FOR UPDATE',
    [idReposicion],
  );
  return rows[0] ?? null;
}

/** Trae las líneas del movimiento de stock original (tipo COMPRA) de esa reposición. */
export async function obtenerLineasMovimientoCompra(client, idReposicion) {
  const { rows } = await client.query(
    `SELECT
       msd.id_variante         AS "idVariante",
       msd.id_ubicacion        AS "idUbicacion",
       msd.cantidad::float     AS "cantidad",
       msd.costo_unitario::float  AS "costoUnitario",
       msd.precio_unitario::float AS "precioUnitario"
     FROM movimiento_stock ms
     JOIN movimiento_stock_detalle msd ON msd.id_movimiento_stock = ms.id_movimiento_stock
     WHERE ms.id_reposicion = $1 AND ms.tipo_movimiento = 'COMPRA'`,
    [idReposicion],
  );
  return rows;
}

export async function marcarReposicionAnulada(client, idReposicion, idUsuario, motivo) {
  await client.query(
    `UPDATE reposicion
       SET anulada = TRUE,
           fecha_anulacion = now(),
           id_usuario_anulacion = $2,
           motivo_anulacion = $3
     WHERE id_reposicion = $1`,
    [idReposicion, idUsuario, motivo],
  );
}