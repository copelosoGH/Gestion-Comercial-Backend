import { asyncHandler } from '../../utils/asyncHandler.js';
import * as authService from './authService.js';
import * as validacion from './authValidacion.js';

/** POST /api/auth/login -> devuelve token + datos del usuario. */
export const login = asyncHandler(async (req, res) => {
  const { usuarioLogin, password } = validacion.validarLogin(req.body);
  const resultado = await authService.autenticar(usuarioLogin, password);
  res.json(resultado);
});

/** GET /api/auth/usuario -> datos del usuario del token (requiere autenticar). */
export const usuario = asyncHandler(async (req, res) => {
  res.json({ usuario: req.usuario });
});