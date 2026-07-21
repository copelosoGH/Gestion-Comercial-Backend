import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { isProd } from './config/env.js';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { autenticar } from './middlewares/autenticar.js';

import healthRoutes from './modules/health/healthRoutes.js';
import authRoutes from './modules/auth/authRoutes.js';
import productosRoutes from './modules/productos/productosRoutes.js';
import ventasRoutes from './modules/ventas/ventasRoutes.js';
import reposicionRoutes from './modules/reposicion/reposicionRoutes.js';
import stockRoutes from './modules/stock/stockRoutes.js';
import cuentaCorrienteRoutes from './modules/cuentaCorriente/cuentaCorrienteRoutes.js';
import clientesRoutes from './modules/clientes/clientesRoutes.js';
import proveedoresRoutes from './modules/proveedores/proveedoresRoutes.js';
import reportesRoutes from './modules/reportes/reportesRoutes.js';
import usuariosRoutes from './modules/usuarios/usuariosRoutes.js';
import movimientosRoutes from './modules/movimientos/movimientosRoutes.js';
import catalogoRoutes from './modules/catalogo/catalogoRoutes.js';
import ubicacionesRoutes from './modules/ubicaciones/ubicacionesRoutes.js';

export function createApp() {
  const app = express();

  // Seguridad y utilidades
  app.use(helmet());
  app.use(cors()); // TODO: en producción, restringir origin al de la app
  app.use(express.json());
  app.use(morgan(isProd ? 'combined' : 'dev'));

  // ---- Rutas abiertas (sin token) ----
  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);

  // ---- Portón de autenticación: todo lo de abajo requiere token ----
  app.use('/api', autenticar);

  // ---- Rutas protegidas ----
  app.use('/api/productos', productosRoutes);
  app.use('/api/ventas', ventasRoutes);
  app.use('/api/reposiciones', reposicionRoutes);
  app.use('/api/stock', stockRoutes);
  app.use('/api/cuenta-corriente', cuentaCorrienteRoutes);
  app.use('/api/clientes', clientesRoutes);
  app.use('/api/proveedores', proveedoresRoutes);
  app.use('/api/reportes', reportesRoutes);
  app.use('/api/usuarios', usuariosRoutes);
  app.use('/api/movimientos', movimientosRoutes);
  app.use('/api', catalogoRoutes); // expone /rubros, /subrubros, /marcas
  app.use('/api/ubicaciones', ubicacionesRoutes);

  // 404 y manejo de errores SIEMPRE al final
  app.use(notFound);
  app.use(errorHandler);

  return app;
}