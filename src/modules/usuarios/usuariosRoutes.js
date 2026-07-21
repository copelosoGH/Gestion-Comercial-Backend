import { Router } from 'express';
import * as usuariosController from './usuariosController.js';
import { requiereRol } from '../../middlewares/autenticar.js';

const router = Router();

// Gestión de usuarios: solo la dueña (rol DUENO).
router.use(requiereRol('DUENO'));

router.get('/', usuariosController.listar);
router.post('/', usuariosController.crear);
router.get('/:id', usuariosController.obtenerPorId);
router.put('/:id', usuariosController.actualizar);
router.delete('/:id', usuariosController.darDeBaja);

export default router;