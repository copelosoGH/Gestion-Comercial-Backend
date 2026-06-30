import { query } from '../../config/db.js';

function construirFiltros({ busqueda, incluirInactivos }) {
  const condiciones = [];
  const params = [];

  if (!incluirInactivos) condiciones.push('activo = TRUE');
  if (busqueda) {
    params.push(`%${busqueda}%`);
    const i = params.length;
    condiciones.push(`(nombre ILIKE $${i} OR email ILIKE $${i})`);
  }

  const clausula = condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : '';
  return { clausula, params };
}

export async function listarProveedores({ busqueda, incluirInactivos, limite, offset }) {
  const { clausula, params } = construirFiltros({ busqueda, incluirInactivos });
  const pLimite = params.length + 1;
  const pOffset = params.length + 2;
  const sql = `
    SELECT
      id_proveedor AS "idProveedor",
      nombre,
      telefono,
      email,
      direccion,
      observaciones,
      activo
    FROM proveedor
    ${clausula}
    ORDER BY nombre
    LIMIT $${pLimite} OFFSET $${pOffset}
  `;
  const { rows } = await query(sql, [...params, limite, offset]);
  return rows;
}

export async function contarProveedores(filtros) {
  const { clausula, params } = construirFiltros(filtros);
  const { rows } = await query(`SELECT COUNT(*)::int AS total FROM proveedor ${clausula}`, params);
  return rows[0].total;
}

export async function obtenerProveedorPorId(idProveedor) {
  const { rows } = await query(
    `SELECT
       id_proveedor AS "idProveedor",
       nombre,
       telefono,
       email,
       direccion,
       observaciones,
       activo
     FROM proveedor
     WHERE id_proveedor = $1`,
    [idProveedor],
  );
  return rows[0] ?? null;
}

export async function crearProveedor(datos) {
  const { rows } = await query(
    `INSERT INTO proveedor (nombre, telefono, email, direccion, observaciones)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id_proveedor AS "idProveedor"`,
    [datos.nombre, datos.telefono, datos.email, datos.direccion, datos.observaciones],
  );
  return rows[0].idProveedor;
}

export async function actualizarProveedor(idProveedor, datos) {
  await query(
    `UPDATE proveedor
       SET nombre = $2,
           telefono = $3,
           email = $4,
           direccion = $5,
           observaciones = $6
     WHERE id_proveedor = $1`,
    [idProveedor, datos.nombre, datos.telefono, datos.email, datos.direccion, datos.observaciones],
  );
}

export async function darDeBajaProveedor(idProveedor) {
  await query('UPDATE proveedor SET activo = FALSE WHERE id_proveedor = $1', [idProveedor]);
}