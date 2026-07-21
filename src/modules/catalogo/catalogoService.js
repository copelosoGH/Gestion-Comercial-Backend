import { ApiError } from '../../utils/apiError.js';
import * as catalogoRepository from './catalogoRepository.js';

// ===================== RUBROS =====================

export async function listarRubros(incluirInactivos) {
  return catalogoRepository.listarRubros(incluirInactivos);
}

export async function obtenerRubro(idRubro) {
  const rubro = await catalogoRepository.obtenerRubroPorId(idRubro);
  if (!rubro) throw ApiError.notFound('Rubro no encontrado');
  return rubro;
}

export async function crearRubro(nombre) {
  const idRubro = await catalogoRepository.crearRubro(nombre);
  return obtenerRubro(idRubro);
}

export async function actualizarRubro(idRubro, nombre) {
  await obtenerRubro(idRubro);
  await catalogoRepository.actualizarRubro(idRubro, nombre);
  return obtenerRubro(idRubro);
}

export async function darDeBajaRubro(idRubro) {
  const rubro = await obtenerRubro(idRubro);
  if (!rubro.activo) throw ApiError.conflict('El rubro ya está dado de baja.');
  await catalogoRepository.darDeBajaRubro(idRubro);
  return { idRubro, activo: false };
}

// ===================== SUBRUBROS =====================

export async function listarSubrubros(filtros) {
  return catalogoRepository.listarSubrubros(filtros);
}

export async function obtenerSubrubro(idSubrubro) {
  const subrubro = await catalogoRepository.obtenerSubrubroPorId(idSubrubro);
  if (!subrubro) throw ApiError.notFound('Subrubro no encontrado');
  return subrubro;
}

export async function crearSubrubro(idRubro, nombre) {
  await obtenerRubro(idRubro); // valida que el rubro exista
  const idSubrubro = await catalogoRepository.crearSubrubro(idRubro, nombre);
  return obtenerSubrubro(idSubrubro);
}

export async function actualizarSubrubro(idSubrubro, idRubro, nombre) {
  await obtenerSubrubro(idSubrubro);
  await obtenerRubro(idRubro);
  await catalogoRepository.actualizarSubrubro(idSubrubro, idRubro, nombre);
  return obtenerSubrubro(idSubrubro);
}

export async function darDeBajaSubrubro(idSubrubro) {
  const subrubro = await obtenerSubrubro(idSubrubro);
  if (!subrubro.activo) throw ApiError.conflict('El subrubro ya está dado de baja.');
  await catalogoRepository.darDeBajaSubrubro(idSubrubro);
  return { idSubrubro, activo: false };
}

// ===================== MARCAS =====================

export async function listarMarcas(incluirInactivos) {
  return catalogoRepository.listarMarcas(incluirInactivos);
}

export async function obtenerMarca(idMarca) {
  const marca = await catalogoRepository.obtenerMarcaPorId(idMarca);
  if (!marca) throw ApiError.notFound('Marca no encontrada');
  return marca;
}

export async function crearMarca(nombre) {
  const idMarca = await catalogoRepository.crearMarca(nombre);
  return obtenerMarca(idMarca);
}

export async function actualizarMarca(idMarca, nombre) {
  await obtenerMarca(idMarca);
  await catalogoRepository.actualizarMarca(idMarca, nombre);
  return obtenerMarca(idMarca);
}

export async function darDeBajaMarca(idMarca) {
  const marca = await obtenerMarca(idMarca);
  if (!marca.activo) throw ApiError.conflict('La marca ya está dada de baja.');
  await catalogoRepository.darDeBajaMarca(idMarca);
  return { idMarca, activo: false };
}