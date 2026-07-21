import { Router } from 'express';
import * as catalogoController from './catalogoController.js';

const router = Router();

// Rubros
router.get('/rubros', catalogoController.listarRubros);
router.post('/rubros', catalogoController.crearRubro);
router.get('/rubros/:id', catalogoController.obtenerRubro);
router.put('/rubros/:id', catalogoController.actualizarRubro);
router.delete('/rubros/:id', catalogoController.darDeBajaRubro);

// Subrubros
router.get('/subrubros', catalogoController.listarSubrubros);
router.post('/subrubros', catalogoController.crearSubrubro);
router.get('/subrubros/:id', catalogoController.obtenerSubrubro);
router.put('/subrubros/:id', catalogoController.actualizarSubrubro);
router.delete('/subrubros/:id', catalogoController.darDeBajaSubrubro);

// Marcas
router.get('/marcas', catalogoController.listarMarcas);
router.post('/marcas', catalogoController.crearMarca);
router.get('/marcas/:id', catalogoController.obtenerMarca);
router.put('/marcas/:id', catalogoController.actualizarMarca);
router.delete('/marcas/:id', catalogoController.darDeBajaMarca);

export default router;