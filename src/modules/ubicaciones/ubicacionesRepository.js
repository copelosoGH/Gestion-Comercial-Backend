import { query } from '../../config/db.js';

export async function listarUbicaciones(incluirInactivos) {
  const clausula = incluirInactivos ? '' : 'WHERE activo = TRUE';
  const { rows } = await query(
    `SELECT id_ubicacion AS "idUbicacion", nombre, direccion, activo
     FROM ubicacion ${clausula} ORDER BY nombre`,
  );
  return rows;
}

export async function obtenerUbicacionPorId(idUbicacion) {
  const { rows } = await query(
    `SELECT id_ubicacion AS "idUbicacion", nombre, direccion, activo
     FROM ubicacion WHERE id_ubicacion = $1`,
    [idUbicacion],
  );
  return rows[0] ?? null;
}

export async function crearUbicacion({ nombre, direccion }) {
  const { rows } = await query(
    `INSERT INTO ubicacion (nombre, direccion)
     VALUES ($1, $2)
     RETURNING id_ubicacion AS "idUbicacion"`,
    [nombre, direccion],
  );
  return rows[0].idUbicacion;
}

export async function actualizarUbicacion(idUbicacion, { nombre, direccion }) {
  await query(
    `UPDATE ubicacion SET nombre = $2, direccion = $3
     WHERE id_ubicacion = $1`,
    [idUbicacion, nombre, direccion],
  );
}

export async function darDeBajaUbicacion(idUbicacion) {
  await query('UPDATE ubicacion SET activo = FALSE WHERE id_ubicacion = $1', [idUbicacion]);
}

/** Suma de existencia (stock) en esa ubicación, para bloquear la baja si hay algo. */
export async function tieneStock(idUbicacion) {
  const { rows } = await query(
    `SELECT COALESCE(SUM(cantidad), 0)::float AS total FROM existencia WHERE id_ubicacion = $1`,
    [idUbicacion],
  );
  return rows[0].total > 0;
}