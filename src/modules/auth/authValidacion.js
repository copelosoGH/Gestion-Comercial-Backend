import { ApiError } from '../../utils/apiError.js';

/** Valida el cuerpo del login: { usuarioLogin, password } */
export function validarLogin(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw ApiError.badRequest('El cuerpo de la petición debe ser un objeto.');
  }
  return {
    usuarioLogin: exigirTexto(body.usuarioLogin, 'usuarioLogin'),
    password: exigirTexto(body.password, 'password'),
  };
}

function exigirTexto(valor, campo) {
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw ApiError.badRequest(`El campo "${campo}" es obligatorio.`);
  }
  return valor.trim();
}