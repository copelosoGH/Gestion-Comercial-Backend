import { Router } from 'express';
import * as stockController from './stockController.js';

const router = Router();

router.post('/transferencias', stockController.transferir);
router.post('/ajustes', stockController.ajustar);
router.post('/mermas', stockController.registrarMerma);
router.get('/alertas', stockController.obtenerAlertas);

export default router;