import { asyncHandler } from '../../utils/asyncHandler.js';
import { generarExcel } from '../../utils/excel.js';
import * as reportesService from './reportesService.js';
import * as validacion from './reportesValidacion.js';

/** Responde el reporte en JSON o como descarga Excel. */
async function responder(res, reporte, formato) {
  if (formato === 'excel') {
    const buffer = await generarExcel(reporte);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${reporte.nombre}.xlsx"`);
    return res.send(buffer);
  }
  return res.json({ items: reporte.filas });
}

/** GET /api/reportes/mas-vendidos?desde&hasta&limite&formato */
export const masVendidos = asyncHandler(async (req, res) => {
  const filtros = validacion.parsearFiltrosMasVendidos(req.query);
  const formato = validacion.parsearFormato(req.query);
  const reporte = await reportesService.masVendidos(filtros);
  await responder(res, reporte, formato);
});

/** GET /api/reportes/margenes?busqueda&idRubro&formato */
export const margenes = asyncHandler(async (req, res) => {
  const filtros = validacion.parsearFiltrosCatalogo(req.query);
  const formato = validacion.parsearFormato(req.query);
  const reporte = await reportesService.margenes(filtros);
  await responder(res, reporte, formato);
});

/** GET /api/reportes/stock?busqueda&idRubro&formato */
export const stock = asyncHandler(async (req, res) => {
  const filtros = validacion.parsearFiltrosCatalogo(req.query);
  const formato = validacion.parsearFormato(req.query);
  const reporte = await reportesService.stock(filtros);
  await responder(res, reporte, formato);
});

/** GET /api/reportes/reposicion?formato */
export const reposicion = asyncHandler(async (req, res) => {
  const formato = validacion.parsearFormato(req.query);
  const reporte = await reportesService.reposicion();
  await responder(res, reporte, formato);
});

/** GET /api/reportes/resumen-ventas?desde&hasta&formato */
export const resumenVentas = asyncHandler(async (req, res) => {
  const filtros = validacion.parsearFiltrosCaja(req.query);
  const formato = validacion.parsearFormato(req.query);
  const reporte = await reportesService.resumenVentas(filtros);
  await responder(res, reporte, formato);
});

/** GET /api/reportes/ventas-por-metodo?desde&hasta&formato */
export const ventasPorMetodo = asyncHandler(async (req, res) => {
  const filtros = validacion.parsearFiltrosCaja(req.query);
  const formato = validacion.parsearFormato(req.query);
  const reporte = await reportesService.ventasPorMetodo(filtros);
  await responder(res, reporte, formato);
});