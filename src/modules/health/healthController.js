import { asyncHandler } from '../../utils/asyncHandler.js';
import { ping } from '../../config/db.js';

/** GET /api/health -> verifica API + conexión a la base. */
export const checkHealth = asyncHandler(async (req, res) => {
  const ts = await ping();
  res.json({
    status: 'ok',
    db: 'up',
    serverTime: ts,
  });
});