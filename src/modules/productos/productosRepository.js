import { query } from '../../config/db.js';

// ---------------------------------------------------------------------
// Arma las condiciones WHERE comunes a listar y contar, devolviendo la
// cláusula y los parámetros ya numerados. Mantiene un solo lugar de verdad
// para los filtros (no duplicar entre las dos queries).
// ---------------------------------------------------------------------
function construirFiltros({ busqueda, idRubro }) {
  const condiciones = [];
  const params = [];

  if (idRubro) {
    params.push(idRubro);
    condiciones.push(`p.id_rubro = $${params.length}`);
  }

  if (busqueda) {
    params.push(`%${busqueda}%`);
    const i = params.length;
    condiciones.push(`(
      p.descripcion_base ILIKE $${i}
      OR EXISTS (
        SELECT 1 FROM producto_variante vb
        WHERE vb.id_producto = p.id_producto
          AND (vb.descripcion_completa ILIKE $${i} OR vb.codigo_barras ILIKE $${i})
      )
    )`);
  }

  const clausula = condiciones.length ? ' AND ' + condiciones.join(' AND ') : '';
  return { clausula, params };
}

/** Lista productos paginados, con su rubro, stock total y rango de precios. */
export async function listarProductos({ busqueda, idRubro, limite, offset }) {
  const { clausula, params } = construirFiltros({ busqueda, idRubro });
  const pLimite = params.length + 1;
  const pOffset = params.length + 2;

  const sql = `
    SELECT
      p.id_producto                       AS "idProducto",
      p.descripcion_base                  AS "descripcion",
      r.id_rubro                          AS "idRubro",
      r.nombre                            AS "rubro",
      COUNT(DISTINCT v.id_variante)::int  AS "cantidadVariantes",
      COALESCE(SUM(e.cantidad), 0)::float AS "stockTotal",
      MIN(v.precio_venta)::float          AS "precioMin",
      MAX(v.precio_venta)::float          AS "precioMax",
      BOOL_OR(v.precio_venta = 0)         AS "tienePrecioPendiente"
    FROM producto p
    JOIN rubro r ON r.id_rubro = p.id_rubro
    LEFT JOIN producto_variante v ON v.id_producto = p.id_producto AND v.activo
    LEFT JOIN existencia e ON e.id_variante = v.id_variante
    WHERE p.activo ${clausula}
    GROUP BY p.id_producto, p.descripcion_base, r.id_rubro, r.nombre
    ORDER BY p.descripcion_base, p.id_producto
    LIMIT $${pLimite} OFFSET $${pOffset}
  `;

  const { rows } = await query(sql, [...params, limite, offset]);
  return rows;
}

/** Cuenta el total de productos que cumplen los filtros (para la paginación). */
export async function contarProductos({ busqueda, idRubro }) {
  const { clausula, params } = construirFiltros({ busqueda, idRubro });
  const sql = `SELECT COUNT(*)::int AS total FROM producto p WHERE p.activo ${clausula}`;
  const { rows } = await query(sql, params);
  return rows[0].total;
}

/** Trae la cabecera del producto con sus nombres de rubro/subrubro/marca. */
export async function obtenerProductoPorId(idProducto) {
  const sql = `
    SELECT
      p.id_producto       AS "idProducto",
      p.descripcion_base  AS "descripcion",
      p.id_rubro          AS "idRubro",
      r.nombre            AS "rubro",
      p.id_subrubro       AS "idSubrubro",
      sr.nombre           AS "subrubro",
      p.id_marca          AS "idMarca",
      m.nombre            AS "marca",
      p.activo            AS "activo"
    FROM producto p
    JOIN rubro r ON r.id_rubro = p.id_rubro
    LEFT JOIN subrubro sr ON sr.id_subrubro = p.id_subrubro
    LEFT JOIN marca m ON m.id_marca = p.id_marca
    WHERE p.id_producto = $1 AND p.activo
  `;
  const { rows } = await query(sql, [idProducto]);
  return rows[0] ?? null;
}

/** Trae las variantes de un producto con su stock total. */
export async function obtenerVariantes(idProducto) {
  const sql = `
    SELECT
      v.id_variante               AS "idVariante",
      v.descripcion_completa      AS "descripcion",
      v.fragancia                 AS "fragancia",
      v.dimension                 AS "dimension",
      v.presentacion              AS "presentacion",
      v.simula_a                  AS "simulaA",
      v.codigo_barras             AS "codigoBarras",
      v.precio_costo::float       AS "precioCosto",
      v.precio_venta::float       AS "precioVenta",
      v.stock_minimo_total::float AS "stockMinimoTotal",
      v.unidad_venta              AS "unidadVenta",
      v.unidades_por_caja         AS "unidadesPorCaja",
      v.activo                    AS "activo",
      COALESCE(SUM(e.cantidad), 0)::float AS "stockTotal"
    FROM producto_variante v
    LEFT JOIN existencia e ON e.id_variante = v.id_variante
    WHERE v.id_producto = $1 AND v.activo
    GROUP BY v.id_variante
    ORDER BY v.id_variante
  `;
  const { rows } = await query(sql, [idProducto]);
  return rows;
}

/** Trae el desglose de existencia por ubicación de todas las variantes del producto. */
export async function obtenerExistencias(idProducto) {
  const sql = `
    SELECT
      e.id_variante          AS "idVariante",
      u.id_ubicacion         AS "idUbicacion",
      u.nombre               AS "ubicacion",
      e.cantidad::float      AS "cantidad",
      e.stock_minimo::float  AS "stockMinimo"
    FROM existencia e
    JOIN ubicacion u ON u.id_ubicacion = e.id_ubicacion
    JOIN producto_variante v ON v.id_variante = e.id_variante
    WHERE v.id_producto = $1
    ORDER BY e.id_variante, u.id_ubicacion
  `;
  const { rows } = await query(sql, [idProducto]);
  return rows;
}

// ===================== ACTUALIZACIÓN (edición) =====================

/** Bloquea y verifica que el producto exista (dentro de la transacción). */
export async function obtenerProductoParaActualizar(client, idProducto) {
  const sql = `SELECT id_producto FROM producto WHERE id_producto = $1 AND activo FOR UPDATE`;
  const { rows } = await client.query(sql, [idProducto]);
  return rows[0] ?? null;
}

export async function existeRubro(client, idRubro) {
  const { rows } = await client.query(
    'SELECT 1 FROM rubro WHERE id_rubro = $1 AND activo',
    [idRubro],
  );
  return rows.length > 0;
}

export async function subrubroPerteneceARubro(client, idSubrubro, idRubro) {
  const { rows } = await client.query(
    'SELECT 1 FROM subrubro WHERE id_subrubro = $1 AND id_rubro = $2 AND activo',
    [idSubrubro, idRubro],
  );
  return rows.length > 0;
}

export async function existeMarca(client, idMarca) {
  const { rows } = await client.query(
    'SELECT 1 FROM marca WHERE id_marca = $1 AND activo',
    [idMarca],
  );
  return rows.length > 0;
}

/** Devuelve un Set con los ids de las variantes activas del producto. */
export async function obtenerIdsVariantes(client, idProducto) {
  const { rows } = await client.query(
    'SELECT id_variante FROM producto_variante WHERE id_producto = $1 AND activo',
    [idProducto],
  );
  return new Set(rows.map((r) => r.id_variante));
}

/** Actualiza la cabecera del producto. */
export async function actualizarProducto(client, idProducto, datos) {
  const sql = `
    UPDATE producto
       SET descripcion_base = $1,
           id_rubro         = $2,
           id_subrubro      = $3,
           id_marca         = $4
     WHERE id_producto = $5
  `;
  await client.query(sql, [
    datos.descripcion,
    datos.idRubro,
    datos.idSubrubro,
    datos.idMarca,
    idProducto,
  ]);
}

/** Actualiza una variante. NO toca el stock (eso va por movimiento_stock). */
export async function actualizarVariante(client, idVariante, v) {
  const sql = `
    UPDATE producto_variante
       SET descripcion_completa = $1,
           fragancia            = $2,
           dimension            = $3,
           presentacion         = $4,
           simula_a             = $5,
           codigo_barras        = $6,
           precio_costo         = $7,
           precio_venta         = $8,
           stock_minimo_total   = $9,
           unidad_venta         = $10,
           unidades_por_caja    = $11
     WHERE id_variante = $12
  `;
  await client.query(sql, [
    v.descripcion,
    v.fragancia,
    v.dimension,
    v.presentacion,
    v.simulaA,
    v.codigoBarras,
    v.precioCosto,
    v.precioVenta,
    v.stockMinimoTotal,
    v.unidadVenta,
    v.unidadesPorCaja,
    idVariante,
  ]);
}

// ===================== ALTA Y BAJA =====================

export async function crearProducto(client, datos) {
  const { rows } = await client.query(
    `INSERT INTO producto (id_rubro, id_subrubro, id_marca, descripcion_base)
     VALUES ($1, $2, $3, $4)
     RETURNING id_producto AS "idProducto"`,
    [datos.idRubro, datos.idSubrubro, datos.idMarca, datos.descripcion],
  );
  return rows[0].idProducto;
}

export async function crearVariante(client, idProducto, v) {
  const { rows } = await client.query(
    `INSERT INTO producto_variante
       (id_producto, descripcion_completa, fragancia, dimension, presentacion,
        simula_a, codigo_barras, precio_costo, precio_venta, stock_minimo_total,
        unidad_venta, unidades_por_caja)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id_variante AS "idVariante"`,
    [
      idProducto, v.descripcion, v.fragancia, v.dimension, v.presentacion,
      v.simulaA, v.codigoBarras, v.precioCosto, v.precioVenta, v.stockMinimoTotal,
      v.unidadVenta, v.unidadesPorCaja,
    ],
  );
  return rows[0].idVariante;
}

/** Crea las filas de existencia en 0 para todas las ubicaciones activas. */
export async function crearExistenciasIniciales(client, idVariante) {
  await client.query(
    `INSERT INTO existencia (id_variante, id_ubicacion, cantidad)
     SELECT $1, id_ubicacion, 0 FROM ubicacion WHERE activo
     ON CONFLICT (id_variante, id_ubicacion) DO NOTHING`,
    [idVariante],
  );
}

/** Devuelve el estado (existe / activo) del producto, con lock. */
export async function obtenerEstadoProducto(client, idProducto) {
  const { rows } = await client.query(
    'SELECT id_producto AS "idProducto", activo AS "activo" FROM producto WHERE id_producto = $1 FOR UPDATE',
    [idProducto],
  );
  return rows[0] ?? null;
}

/** Baja lógica del producto y de todas sus variantes. */
export async function darDeBajaProducto(client, idProducto) {
  await client.query('UPDATE producto SET activo = FALSE WHERE id_producto = $1', [idProducto]);
  await client.query('UPDATE producto_variante SET activo = FALSE WHERE id_producto = $1', [idProducto]);
}