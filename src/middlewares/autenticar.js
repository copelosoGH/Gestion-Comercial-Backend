import { verificarToken } from '../utils/token.js';
import { ApiError } from '../utils/apiError.js';

/**
 * Verifica el JWT del header Authorization: Bearer <token>.
 * Si es válido, deja los datos del usuario en req.usuario.
 */
export function autenticar(req, res, next) {
  const header = req.headers.authorization ?? '';
  const [esquema, token] = header.split(' ');

  if (esquema !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Falta el token de autenticación.'));
  }

  try {
    const payload = verificarToken(token);
    req.usuario = {
      idUsuario: payload.idUsuario,
      nombre: payload.nombre,
      usuarioLogin: payload.usuarioLogin,
      rol: payload.rol,
    };
    next();
  } catch {
    next(ApiError.unauthorized('Token inválido o expirado.'));
  }
}

/**
 * Restringe una ruta a ciertos roles. Usar DESPUÉS de autenticar.
 *   router.post('/', autenticar, requiereRol('DUENO'), controller);
 */
export function requiereRol(...roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return next(ApiError.forbidden('No tenés permisos para esta acción.'));
    }
    next();
  };
}