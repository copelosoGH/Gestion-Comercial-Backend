import * as movimientosRepository from './movimientosRepository.js';

export async function listarMovimientos(filtros) {
  const { pagina, limite } = filtros;
  const offset = (pagina - 1) * limite;
  const [items, total] = await Promise.all([
    movimientosRepository.listarMovimientos({ ...filtros, offset }),
    movimientosRepository.contarMovimientos(filtros),
  ]);
  return {
    items,
    paginacion: { pagina, limite, total, totalPaginas: Math.max(1, Math.ceil(total / limite)) },
  };
}