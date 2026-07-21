import { Router } from 'express';
import * as movimientosController from './movimientosController.js';

const router = Router();

router.get('/', movimientosController.listar);

export default router;