import bcrypt from 'bcryptjs';
import { ApiError } from '../../utils/apiError.js';
import * as usuariosRepository from './usuariosRepository.js';

export async function listarUsuarios(filtros) {
  const { pagina, limite } = filtros;
  const offset = (pagina - 1) * limite;
  const [items, total] = await Promise.all([
    usuariosRepository.listarUsuarios({ ...filtros, offset }),
    usuariosRepository.contarUsuarios(filtros),
  ]);
  return {
    items,
    paginacion: { pagina, limite, total, totalPaginas: Math.max(1, Math.ceil(total / limite)) },
  };
}

export async function obtenerUsuario(idUsuario) {
  const usuario = await usuariosRepository.obtenerUsuarioPorId(idUsuario);
  if (!usuario) throw ApiError.notFound('Usuario no encontrado');
  return usuario;
}

export async function crearUsuario(datos) {
  if (await usuariosRepository.existeLogin(datos.usuarioLogin)) {
    throw ApiError.conflict('Ya existe un usuario con ese nombre de usuario.');
  }
  const passwordHash = await bcrypt.hash(datos.password, 10);
  const idUsuario = await usuariosRepository.crearUsuario({
    nombre: datos.nombre,
    usuarioLogin: datos.usuarioLogin,
    passwordHash,
    rol: datos.rol,
  });
  return obtenerUsuario(idUsuario);
}

export async function actualizarUsuario(idUsuario, datos) {
  const usuario = await usuariosRepository.obtenerUsuarioPorId(idUsuario);
  if (!usuario) throw ApiError.notFound('Usuario no encontrado');

  if (await usuariosRepository.existeLogin(datos.usuarioLogin, idUsuario)) {
    throw ApiError.conflict('Ya existe otro usuario con ese nombre de usuario.');
  }

  const passwordHash = datos.password ? await bcrypt.hash(datos.password, 10) : null;
  await usuariosRepository.actualizarUsuario(idUsuario, {
    nombre: datos.nombre,
    usuarioLogin: datos.usuarioLogin,
    rol: datos.rol,
    passwordHash,
  });
  return obtenerUsuario(idUsuario);
}

/** Baja lógica. No permite que un usuario se dé de baja a sí mismo. */
export async function darDeBajaUsuario(idUsuario, idUsuarioQueOpera) {
  const usuario = await usuariosRepository.obtenerUsuarioPorId(idUsuario);
  if (!usuario) throw ApiError.notFound('Usuario no encontrado');
  if (!usuario.activo) throw ApiError.conflict('El usuario ya está dado de baja.');
  if (idUsuario === idUsuarioQueOpera) {
    throw ApiError.conflict('No podés dar de baja tu propio usuario.');
  }
  await usuariosRepository.darDeBajaUsuario(idUsuario);
  return { idUsuario, activo: false };
}