import { ApiError } from '../../utils/apiError.js';
import * as proveedoresRepository from './proveedoresRepository.js';

export async function listarProveedores(filtros) {
  const { pagina, limite } = filtros;
  const offset = (pagina - 1) * limite;
  const [items, total] = await Promise.all([
    proveedoresRepository.listarProveedores({ ...filtros, offset }),
    proveedoresRepository.contarProveedores(filtros),
  ]);
  return {
    items,
    paginacion: { pagina, limite, total, totalPaginas: Math.max(1, Math.ceil(total / limite)) },
  };
}

export async function obtenerProveedor(idProveedor) {
  const proveedor = await proveedoresRepository.obtenerProveedorPorId(idProveedor);
  if (!proveedor) throw ApiError.notFound('Proveedor no encontrado');
  return proveedor;
}

export async function crearProveedor(datos) {
  const idProveedor = await proveedoresRepository.crearProveedor(datos);
  return obtenerProveedor(idProveedor);
}

export async function actualizarProveedor(idProveedor, datos) {
  const proveedor = await proveedoresRepository.obtenerProveedorPorId(idProveedor);
  if (!proveedor) throw ApiError.notFound('Proveedor no encontrado');
  await proveedoresRepository.actualizarProveedor(idProveedor, datos);
  return obtenerProveedor(idProveedor);
}

export async function darDeBajaProveedor(idProveedor) {
  const proveedor = await proveedoresRepository.obtenerProveedorPorId(idProveedor);
  if (!proveedor) throw ApiError.notFound('Proveedor no encontrado');
  if (!proveedor.activo) throw ApiError.conflict('El proveedor ya está dado de baja.');
  await proveedoresRepository.darDeBajaProveedor(idProveedor);
  return { idProveedor, activo: false };
}