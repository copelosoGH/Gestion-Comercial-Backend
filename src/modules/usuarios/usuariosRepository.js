import { query } from '../../config/db.js';

function construirFiltros({ busqueda, rol, incluirInactivos }) {
  const condiciones = [];
  const params = [];
  if (!incluirInactivos) condiciones.push('activo = TRUE');
  if (rol) {
    params.push(rol);
    condiciones.push(`rol = $${params.length}`);
  }
  if (busqueda) {
    params.push(`%${busqueda}%`);
    const i = params.length;
    condiciones.push(`(nombre ILIKE $${i} OR usuario_login ILIKE $${i})`);
  }
  const clausula = condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : '';
  return { clausula, params };
}

export async function listarUsuarios({ busqueda, rol, incluirInactivos, limite, offset }) {
  const { clausula, params } = construirFiltros({ busqueda, rol, incluirInactivos });
  const pLimite = params.length + 1;
  const pOffset = params.length + 2;
  const sql = `
    SELECT id_usuario AS "idUsuario", nombre, usuario_login AS "usuarioLogin",
           rol, activo, creado_en AS "creadoEn"
    FROM usuario
    ${clausula}
    ORDER BY nombre
    LIMIT $${pLimite} OFFSET $${pOffset}
  `;
  const { rows } = await query(sql, [...params, limite, offset]);
  return rows;
}

export async function contarUsuarios(filtros) {
  const { clausula, params } = construirFiltros(filtros);
  const { rows } = await query(`SELECT COUNT(*)::int AS total FROM usuario ${clausula}`, params);
  return rows[0].total;
}

export async function obtenerUsuarioPorId(idUsuario) {
  const { rows } = await query(
    `SELECT id_usuario AS "idUsuario", nombre, usuario_login AS "usuarioLogin",
            rol, activo, creado_en AS "creadoEn"
     FROM usuario WHERE id_usuario = $1`,
    [idUsuario],
  );
  return rows[0] ?? null;
}

export async function existeLogin(usuarioLogin, excluirId = null) {
  const params = [usuarioLogin];
  let sql = 'SELECT 1 FROM usuario WHERE usuario_login = $1';
  if (excluirId) {
    params.push(excluirId);
    sql += ' AND id_usuario <> $2';
  }
  const { rows } = await query(sql, params);
  return rows.length > 0;
}

export async function crearUsuario({ nombre, usuarioLogin, passwordHash, rol }) {
  const { rows } = await query(
    `INSERT INTO usuario (nombre, usuario_login, password_hash, rol)
     VALUES ($1, $2, $3, $4)
     RETURNING id_usuario AS "idUsuario"`,
    [nombre, usuarioLogin, passwordHash, rol],
  );
  return rows[0].idUsuario;
}

/** Actualiza datos del usuario. passwordHash es opcional (null = no cambiarla). */
export async function actualizarUsuario(idUsuario, { nombre, usuarioLogin, rol, passwordHash }) {
  if (passwordHash) {
    await query(
      `UPDATE usuario SET nombre=$2, usuario_login=$3, rol=$4, password_hash=$5 WHERE id_usuario=$1`,
      [idUsuario, nombre, usuarioLogin, rol, passwordHash],
    );
  } else {
    await query(
      `UPDATE usuario SET nombre=$2, usuario_login=$3, rol=$4 WHERE id_usuario=$1`,
      [idUsuario, nombre, usuarioLogin, rol],
    );
  }
}

export async function darDeBajaUsuario(idUsuario) {
  await query('UPDATE usuario SET activo = FALSE WHERE id_usuario = $1', [idUsuario]);
}