import { Router } from 'express';
import * as clientesController from './clientesController.js';

const router = Router();

router.get('/', clientesController.listar);
router.post('/', clientesController.crear);
router.get('/:id', clientesController.obtenerPorId);
router.put('/:id', clientesController.actualizar);
router.delete('/:id', clientesController.darDeBaja);

export default router;