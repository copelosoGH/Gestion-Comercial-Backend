import bcrypt from 'bcryptjs';
import { ApiError } from '../../utils/apiError.js';
import { firmarToken } from '../../utils/token.js';
import * as authRepository from './authRepository.js';

/**
 * Autentica por usuario + contraseña. Devuelve el token y los datos del
 * usuario (sin el hash). Usa un mensaje genérico para no revelar si el
 * usuario existe o no.
 */
export async function autenticar(usuarioLogin, password) {
  const credencialesInvalidas = () => ApiError.unauthorized('Usuario o contraseña incorrectos.');

  const usuario = await authRepository.obtenerUsuarioPorLogin(usuarioLogin);
  if (!usuario || !usuario.activo) {
    throw credencialesInvalidas();
  }

  const coincide = await bcrypt.compare(password, usuario.passwordHash);
  if (!coincide) {
    throw credencialesInvalidas();
  }

  const datosUsuario = {
    idUsuario: usuario.idUsuario,
    nombre: usuario.nombre,
    usuarioLogin: usuario.usuarioLogin,
    rol: usuario.rol,
  };

  return { token: firmarToken(datosUsuario), usuario: datosUsuario };
}