import { ApiError } from '../../utils/apiError.js';

/**
 * Valida el cuerpo del POST /api/reposiciones.
 * {
 *   idUsuario, idProveedor, idUbicacion?, numeroFactura?, fecha?, observacion?,
 *   items: [{ idVariante, cantidadCajas, unidadesPorCaja, costoUnitario }]
 * }
 */
export function validarNuevaReposicion(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw ApiError.badRequest('El cuerpo de la petición debe ser un objeto.');
  }

  const idUsuario = exigirId(body.idUsuario, 'idUsuario');
  const idProveedor = exigirId(body.idProveedor, 'idProveedor');
  const idUbicacion = idOpcional(body.idUbicacion, 'idUbicacion');
  const numeroFactura = textoOpcional(body.numeroFactura, 'numeroFactura', 40);
  const observacion = textoOpcional(body.observacion, 'observacion', 500);
  const fecha = fechaOpcional(body.fecha, 'fecha');

  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw ApiError.badRequest('La reposición debe tener al menos un item.');
  }
  const items = body.items.map((it, i) => {
    if (typeof it !== 'object' || it === null) {
      throw ApiError.badRequest(`El item #${i + 1} debe ser un objeto.`);
    }
    return {
      idVariante: exigirId(it.idVariante, `items[${i}].idVariante`),
      cantidadCajas: exigirNumeroPositivo(it.cantidadCajas, `items[${i}].cantidadCajas`),
      unidadesPorCaja: exigirEnteroPositivo(it.unidadesPorCaja, `items[${i}].unidadesPorCaja`),
      costoUnitario: exigirNumeroNoNegativo(it.costoUnitario, `items[${i}].costoUnitario`),
    };
  });

  return { idUsuario, idProveedor, idUbicacion, numeroFactura, observacion, fecha, items };
}

export function parsearFiltrosListado(query) {
  const pagina = exigirEnteroOpcional(query.pagina, 1, 'pagina');
  let limite = exigirEnteroOpcional(query.limite, 20, 'limite');
  if (limite > 100) limite = 100;
  return {
    pagina,
    limite,
    desde: fechaOpcional(query.desde, 'desde'),
    hasta: fechaOpcional(query.hasta, 'hasta'),
    idProveedor: idOpcional(query.idProveedor, 'idProveedor'),
    incluirAnuladas: query.incluirAnuladas === 'true' || query.incluirAnuladas === '1',
  };
}

export function parsearIdRuta(valor) {
  return exigirId(valor, 'id');
}

/** Valida el cuerpo de la anulación: { idUsuario, motivo? } */
export function validarAnulacion(body) {
  const b = typeof body === 'object' && body !== null ? body : {};
  return {
    idUsuario: exigirId(b.idUsuario, 'idUsuario'),
    motivo: textoOpcional(b.motivo, 'motivo', 300),
  };
}

// ---- helpers ----

function exigirId(valor, campo) {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) {
    throw ApiError.badRequest(`El campo "${campo}" debe ser un entero positivo.`);
  }
  return n;
}

function idOpcional(valor, campo) {
  if (valor === undefined || valor === null || valor === '') return null;
  return exigirId(valor, campo);
}

function exigirNumeroPositivo(valor, campo) {
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0) {
    throw ApiError.badRequest(`El campo "${campo}" debe ser un número mayor a 0.`);
  }
  return n;
}

function exigirNumeroNoNegativo(valor, campo) {
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0) {
    throw ApiError.badRequest(`El campo "${campo}" debe ser un número mayor o igual a 0.`);
  }
  return n;
}

function exigirEnteroPositivo(valor, campo) {
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 1) {
    throw ApiError.badRequest(`El campo "${campo}" debe ser un entero mayor o igual a 1.`);
  }
  return n;
}

function exigirEnteroOpcional(valor, porDefecto, campo) {
  if (valor === undefined || valor === '') return porDefecto;
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 1) {
    throw ApiError.badRequest(`El parámetro "${campo}" debe ser un entero mayor o igual a 1.`);
  }
  return n;
}

function textoOpcional(valor, campo, maxLargo) {
  if (valor === undefined || valor === null) return null;
  if (typeof valor !== 'string') {
    throw ApiError.badRequest(`El campo "${campo}" debe ser texto.`);
  }
  const limpio = valor.trim();
  if (limpio === '') return null;
  if (limpio.length > maxLargo) {
    throw ApiError.badRequest(`El campo "${campo}" supera el largo máximo (${maxLargo}).`);
  }
  return limpio;
}

function fechaOpcional(valor, campo) {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor) || Number.isNaN(Date.parse(valor))) {
    throw ApiError.badRequest(`El parámetro "${campo}" debe tener formato YYYY-MM-DD.`);
  }
  return valor;
}