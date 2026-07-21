import { Router } from 'express';
import * as ubicacionesController from './ubicacionesController.js';

const router = Router();

router.get('/', ubicacionesController.listar);
router.post('/', ubicacionesController.crear);
router.get('/:id', ubicacionesController.obtenerPorId);
router.put('/:id', ubicacionesController.actualizar);
router.delete('/:id', ubicacionesController.darDeBaja);

export default router;