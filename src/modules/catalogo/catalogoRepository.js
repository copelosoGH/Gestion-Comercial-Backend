import { query } from '../../config/db.js';

// ===================== RUBROS =====================

export async function listarRubros(incluirInactivos) {
  const clausula = incluirInactivos ? '' : 'WHERE activo = TRUE';
  const { rows } = await query(
    `SELECT id_rubro AS "idRubro", nombre, activo FROM rubro ${clausula} ORDER BY nombre`,
  );
  return rows;
}

export async function obtenerRubroPorId(idRubro) {
  const { rows } = await query(
    `SELECT id_rubro AS "idRubro", nombre, activo FROM rubro WHERE id_rubro = $1`,
    [idRubro],
  );
  return rows[0] ?? null;
}

export async function crearRubro(nombre) {
  const { rows } = await query(
    `INSERT INTO rubro (nombre) VALUES ($1) RETURNING id_rubro AS "idRubro"`,
    [nombre],
  );
  return rows[0].idRubro;
}

export async function actualizarRubro(idRubro, nombre) {
  await query('UPDATE rubro SET nombre = $2 WHERE id_rubro = $1', [idRubro, nombre]);
}

export async function darDeBajaRubro(idRubro) {
  await query('UPDATE rubro SET activo = FALSE WHERE id_rubro = $1', [idRubro]);
}

// ===================== SUBRUBROS =====================

export async function listarSubrubros({ idRubro, incluirInactivos }) {
  const condiciones = [];
  const params = [];
  if (!incluirInactivos) condiciones.push('activo = TRUE');
  if (idRubro) {
    params.push(idRubro);
    condiciones.push(`id_rubro = $${params.length}`);
  }
  const clausula = condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : '';
  const { rows } = await query(
    `SELECT id_subrubro AS "idSubrubro", id_rubro AS "idRubro", nombre, activo
     FROM subrubro ${clausula} ORDER BY nombre`,
    params,
  );
  return rows;
}

export async function obtenerSubrubroPorId(idSubrubro) {
  const { rows } = await query(
    `SELECT id_subrubro AS "idSubrubro", id_rubro AS "idRubro", nombre, activo
     FROM subrubro WHERE id_subrubro = $1`,
    [idSubrubro],
  );
  return rows[0] ?? null;
}

export async function crearSubrubro(idRubro, nombre) {
  const { rows } = await query(
    `INSERT INTO subrubro (id_rubro, nombre) VALUES ($1, $2) RETURNING id_subrubro AS "idSubrubro"`,
    [idRubro, nombre],
  );
  return rows[0].idSubrubro;
}

export async function actualizarSubrubro(idSubrubro, idRubro, nombre) {
  await query(
    'UPDATE subrubro SET id_rubro = $2, nombre = $3 WHERE id_subrubro = $1',
    [idSubrubro, idRubro, nombre],
  );
}

export async function darDeBajaSubrubro(idSubrubro) {
  await query('UPDATE subrubro SET activo = FALSE WHERE id_subrubro = $1', [idSubrubro]);
}

// ===================== MARCAS =====================

export async function listarMarcas(incluirInactivos) {
  const clausula = incluirInactivos ? '' : 'WHERE activo = TRUE';
  const { rows } = await query(
    `SELECT id_marca AS "idMarca", nombre, activo FROM marca ${clausula} ORDER BY nombre`,
  );
  return rows;
}

export async function obtenerMarcaPorId(idMarca) {
  const { rows } = await query(
    `SELECT id_marca AS "idMarca", nombre, activo FROM marca WHERE id_marca = $1`,
    [idMarca],
  );
  return rows[0] ?? null;
}

export async function crearMarca(nombre) {
  const { rows } = await query(
    `INSERT INTO marca (nombre) VALUES ($1) RETURNING id_marca AS "idMarca"`,
    [nombre],
  );
  return rows[0].idMarca;
}

export async function actualizarMarca(idMarca, nombre) {
  await query('UPDATE marca SET nombre = $2 WHERE id_marca = $1', [idMarca, nombre]);
}

export async function darDeBajaMarca(idMarca) {
  await query('UPDATE marca SET activo = FALSE WHERE id_marca = $1', [idMarca]);
}