/** Responde 404 para cualquier ruta no registrada. */
export function notFound(req, res) {
  res.status(404).json({
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
}