import { ApiError } from '../utils/apiError.js';
import { isProd } from '../config/env.js';

/**
 * Manejador central de errores. Va SIEMPRE al final de la cadena de
 * middlewares (después de las rutas y del notFound).
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Errores controlados de la app
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // Violación de restricción única de Postgres (ej: codigo_barras repetido)
  if (err.code === '23505') {
    return res.status(409).json({
      error: 'Ya existe un registro con ese valor único.',
      ...(isProd ? {} : { detail: err.detail }),
    });
  }
  // Violación de FK
  if (err.code === '23503') {
    return res.status(409).json({
      error: 'La operación viola una relación con otra entidad.',
      ...(isProd ? {} : { detail: err.detail }),
    });
  }

  // Cualquier otra cosa: 500
  console.error('[error]', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    ...(isProd ? {} : { message: err.message }),
  });
}