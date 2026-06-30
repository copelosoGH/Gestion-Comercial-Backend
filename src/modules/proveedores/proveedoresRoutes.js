import { Router } from 'express';
import * as proveedoresController from './proveedoresController.js';

const router = Router();

router.get('/', proveedoresController.listar);
router.post('/', proveedoresController.crear);
router.get('/:id', proveedoresController.obtenerPorId);
router.put('/:id', proveedoresController.actualizar);
router.delete('/:id', proveedoresController.darDeBaja);

export default router;