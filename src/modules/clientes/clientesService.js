import { ApiError } from '../../utils/apiError.js';
import * as clientesRepository from './clientesRepository.js';

export async function listarClientes(filtros) {
  const { pagina, limite } = filtros;
  const offset = (pagina - 1) * limite;
  const [items, total] = await Promise.all([
    clientesRepository.listarClientes({ ...filtros, offset }),
    clientesRepository.contarClientes(filtros),
  ]);
  return {
    items,
    paginacion: { pagina, limite, total, totalPaginas: Math.max(1, Math.ceil(total / limite)) },
  };
}

export async function obtenerCliente(idCliente) {
  const cliente = await clientesRepository.obtenerClientePorId(idCliente);
  if (!cliente) throw ApiError.notFound('Cliente no encontrado');
  return cliente;
}

export async function crearCliente(datos) {
  const idCliente = await clientesRepository.crearCliente(datos);
  return obtenerCliente(idCliente);
}

export async function actualizarCliente(idCliente, datos) {
  const cliente = await clientesRepository.obtenerClientePorId(idCliente);
  if (!cliente) throw ApiError.notFound('Cliente no encontrado');
  await clientesRepository.actualizarCliente(idCliente, datos);
  return obtenerCliente(idCliente);
}

export async function darDeBajaCliente(idCliente) {
  const cliente = await clientesRepository.obtenerClientePorId(idCliente);
  if (!cliente) throw ApiError.notFound('Cliente no encontrado');
  if (!cliente.activo) throw ApiError.conflict('El cliente ya está dado de baja.');
  if (cliente.saldo > 0) {
    throw ApiError.conflict('No se puede dar de baja un cliente con deuda pendiente.', {
      saldo: cliente.saldo,
    });
  }
  await clientesRepository.darDeBajaCliente(idCliente);
  return { idCliente, activo: false };
}