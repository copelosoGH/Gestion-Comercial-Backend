import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/** Firma un JWT con los datos del usuario. */
export function firmarToken(payload) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

/** Verifica un JWT y devuelve su payload (lanza si es inválido/expirado). */
export function verificarToken(token) {
  return jwt.verify(token, config.jwt.secret);
}