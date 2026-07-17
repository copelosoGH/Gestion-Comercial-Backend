import bcrypt from 'bcryptjs';
import { query, closePool } from '../config/db.js';

const [, , nombre, usuarioLogin, password, rol = 'DUENO'] = process.argv;

if (!nombre || !usuarioLogin || !password) {
  console.error('Uso: node scripts/crearUsuario.js "Nombre" usuarioLogin contraseña [DUENO|EMPLEADO]');
  process.exit(1);
}

if (!['DUENO', 'EMPLEADO'].includes(rol)) {
  console.error('El rol debe ser DUENO o EMPLEADO.');
  process.exit(1);
}

try {
  const passwordHash = await bcrypt.hash(password, 10);
  const { rows } = await query(
    `INSERT INTO usuario (nombre, usuario_login, password_hash, rol)
     VALUES ($1, $2, $3, $4)
     RETURNING id_usuario AS "idUsuario"`,
    [nombre, usuarioLogin, passwordHash, rol],
  );
  console.log(`Usuario creado. id=${rows[0].idUsuario}, login=${usuarioLogin}, rol=${rol}`);
} catch (err) {
  if (err.code === '23505') {
    console.error(`Ya existe un usuario con el login "${usuarioLogin}".`);
  } else {
    console.error('Error:', err.message);
  }
} finally {
  await closePool();
}