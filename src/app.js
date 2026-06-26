import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { isProd } from './config/env.js';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';

import healthRoutes from './modules/health/healthRoutes.js';
import productosRoutes from './modules/productos/productosRoutes.js';

export function createApp() {
  const app = express();

  // Seguridad y utilidades
  app.use(helmet());
  app.use(cors()); // TODO: en producción, restringir origin al de la app
  app.use(express.json());
  app.use(morgan(isProd ? 'combined' : 'dev'));

  // ---- Rutas de la API ----
  app.use('/api/health', healthRoutes);
  app.use('/api/productos', productosRoutes);
  // Próximos módulos (mismo patrón):
  // app.use('/api/ventas',     ventaRoutes);
  // app.use('/api/compras',    reposicionRoutes);
  // app.use('/api/stock',      stockRoutes);
  // app.use('/api/clientes',   clienteRoutes);

  // 404 y manejo de errores SIEMPRE al final
  app.use(notFound);
  app.use(errorHandler);

  return app;
}