import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { isProd } from './config/env.js';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';

import healthRoutes from './modules/health/healthRoutes.js';
import productosRoutes from './modules/productos/productosRoutes.js';
import ventasRoutes from './modules/ventas/ventasRoutes.js';
import stockRoutes from './modules/stock/stockRoutes.js';
import cuentaCorrienteRoutes from './modules/cuentaCorriente/cuentaCorrienteRoutes.js';
import clientesroutes from './modules/clientes/clientesRoutes.js';
import proveedoresRoutes from './modules/proveedores/proveedoresRoutes.js';

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
  app.use('/api/ventas', ventasRoutes);
  app.use('/api/stock', stockRoutes);
  app.use('/api/cuenta-corriente', cuentaCorrienteRoutes);
  app.use('/api/clientes', clientesroutes);
  app.use('/api/proveedores', proveedoresRoutes);

  // 404 y manejo de errores SIEMPRE al final
  app.use(notFound);
  app.use(errorHandler);

  return app;
}