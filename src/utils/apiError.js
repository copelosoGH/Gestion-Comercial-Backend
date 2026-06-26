/**
 * Error de aplicación con código HTTP.
 * Lo lanzan los services/controllers y lo formatea el errorHandler.
 *
 *   throw ApiError.notFound('Producto no encontrado');
 *   throw ApiError.conflict('Stock insuficiente en el Local', { disponible: 3 });
 */
export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }
  static unauthorized(message = 'No autorizado') {
    return new ApiError(401, message);
  }
  static forbidden(message = 'Prohibido') {
    return new ApiError(403, message);
  }
  static notFound(message = 'No encontrado') {
    return new ApiError(404, message);
  }
  static conflict(message, details) {
    return new ApiError(409, message, details);
  }
}