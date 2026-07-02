import { Router } from 'express';
import * as reportesController from './reportesController.js';

const router = Router();

router.get('/mas-vendidos', reportesController.masVendidos);
router.get('/margenes', reportesController.margenes);
router.get('/stock', reportesController.stock);
router.get('/reposicion', reportesController.reposicion);

export default router;