import { createApp } from './app.js';
import { config } from './config/env.js';
import { ping, closePool } from './config/db.js';

const app = createApp();

const server = app.listen(config.port, async () => {
  console.log(`[server] API escuchando en http://localhost:${config.port} (${config.env})`);
  try {
    const ts = await ping();
    console.log(`[db] Conexión a Neon OK — hora del servidor: ${ts}`);
  } catch (err) {
    console.error('[db] No se pudo conectar a la base:', err.message);
  }
});

// Apagado ordenado: cerrar HTTP y después el pool de conexiones.
async function shutdown(signal) {
  console.log(`\n[server] ${signal} recibido. Cerrando...`);
  server.close(async () => {
    try {
      await closePool();
      console.log('[server] Cerrado limpio.');
      process.exit(0);
    } catch (err) {
      console.error('[server] Error al cerrar el pool:', err);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));