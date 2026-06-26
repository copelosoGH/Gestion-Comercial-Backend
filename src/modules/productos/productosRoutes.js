import { Router } from 'express';
import * as productosController from './productosController.js';

const router = Router();

router.get('/', productosController.listar);
router.get('/:id', productosController.obtenerPorId);
router.put('/:id', productosController.actualizar);

export default router;