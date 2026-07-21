import { ApiError } from '../../utils/apiError.js';
import * as ubicacionesRepository from './ubicacionesRepository.js';

export async function listarUbicaciones(incluirInactivos) {
  return ubicacionesRepository.listarUbicaciones(incluirInactivos);
}

export async function obtenerUbicacion(idUbicacion) {
  const ubicacion = await ubicacionesRepository.obtenerUbicacionPorId(idUbicacion);
  if (!ubicacion) throw ApiError.notFound('Ubicación no encontrada');
  return ubicacion;
}

export async function crearUbicacion(datos) {
  const idUbicacion = await ubicacionesRepository.crearUbicacion(datos);
  return obtenerUbicacion(idUbicacion);
}

export async function actualizarUbicacion(idUbicacion, datos) {
  await obtenerUbicacion(idUbicacion);
  await ubicacionesRepository.actualizarUbicacion(idUbicacion, datos);
  return obtenerUbicacion(idUbicacion);
}

/** Baja lógica. Bloqueada si la ubicación todavía tiene stock cargado. */
export async function darDeBajaUbicacion(idUbicacion) {
  const ubicacion = await obtenerUbicacion(idUbicacion);
  if (!ubicacion.activo) throw ApiError.conflict('La ubicación ya está dada de baja.');
  if (await ubicacionesRepository.tieneStock(idUbicacion)) {
    throw ApiError.conflict('No se puede dar de baja una ubicación que todavía tiene stock.');
  }
  await ubicacionesRepository.darDeBajaUbicacion(idUbicacion);
  return { idUbicacion, activo: false };
}