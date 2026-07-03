import { Router } from 'express';
import * as authController from './authController.js';
import { autenticar } from '../../middlewares/autenticar.js';

const router = Router();

router.post('/login', authController.login);
router.get('/usuario', autenticar, authController.usuario);

export default router;