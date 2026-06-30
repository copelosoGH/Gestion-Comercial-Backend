import { Router } from 'express';
import * as ventasController from './ventasController.js';

const router = Router();

router.get('/', ventasController.listar);
router.post('/', ventasController.crear);
router.get('/:id', ventasController.obtenerPorId);
router.post('/:id/anular', ventasController.anular);

export default router;