import { Router } from 'express';
import * as cuentaCorrienteController from './cuentaCorrienteController.js';

const router = Router();

router.post('/pagos', cuentaCorrienteController.registrarPago);
router.get('/pagos/:id', cuentaCorrienteController.obtenerPago);
router.get('/clientes/:id/estado', cuentaCorrienteController.obtenerEstadoCuenta);
router.get('/deudores', cuentaCorrienteController.listarDeudores);

export default router;