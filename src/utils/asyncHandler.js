/**
 * Envuelve un controlador async y manda cualquier error rechazado al
 * errorHandler, sin tener que escribir try/catch en cada endpoint.
 *
 *   router.get('/', asyncHandler(async (req, res) => { ... }));
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);