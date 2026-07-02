import { Router } from 'express';
import * as productosController from './productosController.js';

const router = Router();

router.get('/', productosController.listar);
router.post('/', productosController.crear);
router.get('/:id', productosController.obtenerPorId);
router.put('/:id', productosController.actualizar);
router.delete('/:id', productosController.darDeBaja);

export default router;