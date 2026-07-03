import { Router } from 'express';
import * as reposicionController from './reposicionController.js';

const router = Router();

router.get('/', reposicionController.listar);
router.post('/', reposicionController.crear);
router.get('/:id', reposicionController.obtenerPorId);
router.post('/:id/anular', reposicionController.anular);

export default router;