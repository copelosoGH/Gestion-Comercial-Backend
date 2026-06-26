import dotenv from 'dotenv';

// Carga .env lo antes posible (este módulo se importa antes que db.js).
dotenv.config();

/** Devuelve la variable o corta el arranque si falta. */
function required(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Falta la variable de entorno obligatoria: ${name}`);
  }
  return value;
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  db: {
    connectionString: required('DATABASE_URL'),
    poolMax: Number(process.env.DB_POOL_MAX ?? 10),
  },
};

export const isProd = config.env === 'production';