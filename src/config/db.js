import pg from 'pg';
import { config } from './env.js';

const { Pool } = pg;

// ---------------------------------------------------------------------
// Pool de conexiones a Neon (PostgreSQL).
// ---------------------------------------------------------------------
export const pool = new Pool({
  connectionString: config.db.connectionString,
  max: config.db.poolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  // Neon exige SSL. Sus certificados son válidos; dejamos rejectUnauthorized
  // en false para que conecte sin fricción a través del endpoint pooled.
  // Si querés validación estricta de la cadena de certificados, ponelo en
  // true (y de ser necesario agregá el CA de Neon).
  ssl: { rejectUnauthorized: false },
});

// Captura errores de clientes idle (ej: corte de red con Neon) para que
// no tiren abajo el proceso.
pool.on('error', (err) => {
  console.error('[db] Error inesperado en cliente idle del pool:', err);
});

/**
 * Query simple (fuera de transacción).
 * SIEMPRE con parámetros ($1, $2, ...). Nunca concatenar strings (SQL injection).
 *
 *   const { rows } = await query('SELECT * FROM producto WHERE id_producto = $1', [id]);
 */
export function query(text, params) {
  return pool.query(text, params);
}

/**
 * Ejecuta una función dentro de una transacción atómica.
 *   - BEGIN automático
 *   - COMMIT si el callback resuelve
 *   - ROLLBACK si el callback lanza
 *   - release() del client siempre
 *
 * Es LA pieza base de toda operación que toca stock o cuenta corriente:
 * venta (descuento de stock + remito), compra, transferencia, pago FIFO.
 * El callback recibe el `client` con transacción abierta: usalo para TODAS
 * las queries de esa operación (no mezcles `query()` del pool adentro).
 *
 *   const venta = await withTransaction(async (client) => {
 *     const { rows } = await client.query('INSERT INTO venta (...) RETURNING *', [...]);
 *     await client.query('INSERT INTO movimiento_stock (...)', [...]);
 *     // ... descontar existencia con SELECT ... FOR UPDATE ...
 *     return rows[0];
 *   });
 */
export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Ping a la base (para el health check y el log de arranque). */
export async function ping() {
  const { rows } = await pool.query('SELECT now() AS ts');
  return rows[0].ts;
}

/** Cierra el pool de forma ordenada (shutdown). */
export function closePool() {
  return pool.end();
}