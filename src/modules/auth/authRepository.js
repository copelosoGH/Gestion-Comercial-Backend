import { query } from '../../config/db.js';

/** Trae el usuario por su login, incluyendo el hash de contraseña. */
export async function obtenerUsuarioPorLogin(usuarioLogin) {
  const { rows } = await query(
    `SELECT
       id_usuario    AS "idUsuario",
       nombre,
       usuario_login AS "usuarioLogin",
       password_hash AS "passwordHash",
       rol,
       activo
     FROM usuario
     WHERE usuario_login = $1`,
    [usuarioLogin],
  );
  return rows[0] ?? null;
}