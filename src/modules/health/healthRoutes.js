import { Router } from 'express';
import { checkHealth } from './healthController.js';

const router = Router();

router.get('/', checkHealth);

export default router;