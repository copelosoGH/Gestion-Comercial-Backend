import { ApiError } from '../../utils/apiError.js';

const MEDIOS_PAGO_VALIDOS = [
  'EFECTIVO', 'DEBITO', 'CREDITO', 'TRANSFERENCIA', 'QR', 'CUENTA_CORRIENTE',
];

/**
 * Valida y normaliza el cuerpo del POST /api/ventas.
 * Estructura esperada:
 * {
 *   idUsuario, idCliente?, idUbicacion?, observacion?, numeroRemito?,
 *   items: [{ idVariante, cantidad }],
 *   pagos: [{ medioPago, monto }]
 * }
 */
export function validarNuevaVenta(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw ApiError.badRequest('El cuerpo de la petición debe ser un objeto.');
  }

  const idUsuario = exigirId(body.idUsuario, 'idUsuario');
  const idCliente = idOpcional(body.idCliente, 'idCliente');
  const idUbicacion = idOpcional(body.idUbicacion, 'idUbicacion');
  const observacion = textoOpcional(body.observacion, 'observacion', 500);
  const numeroRemito = textoOpcional(body.numeroRemito, 'numeroRemito', 40);

  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw ApiError.badRequest('La venta debe tener al menos un item.');
  }
  const items = body.items.map((it, i) => {
    if (typeof it !== 'object' || it === null) {
      throw ApiError.badRequest(`El item #${i + 1} debe ser un objeto.`);
    }
    return {
      idVariante: exigirId(it.idVariante, `items[${i}].idVariante`),
      cantidad: exigirNumeroPositivo(it.cantidad, `items[${i}].cantidad`),
    };
  });

  if (!Array.isArray(body.pagos) || body.pagos.length === 0) {
    throw ApiError.badRequest('La venta debe tener al menos un pago.');
  }
  const pagos = body.pagos.map((p, i) => {
    if (typeof p !== 'object' || p === null) {
      throw ApiError.badRequest(`El pago #${i + 1} debe ser un objeto.`);
    }
    return {
      medioPago: validarMedioPago(p.medioPago, `pagos[${i}].medioPago`),
      monto: exigirNumeroPositivo(p.monto, `pagos[${i}].monto`),
    };
  });

  return { idUsuario, idCliente, idUbicacion, observacion, numeroRemito, items, pagos };
}

/** Valida el id de ruta (GET /api/ventas/:id). */
export function parsearIdRuta(valor) {
  return exigirId(valor, 'id');
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

function validarMedioPago(valor, campo) {
  if (typeof valor !== 'string' || !MEDIOS_PAGO_VALIDOS.includes(valor)) {
    throw ApiError.badRequest(
      `El campo "${campo}" debe ser uno de: ${MEDIOS_PAGO_VALIDOS.join(', ')}.`,
    );
  }
  return valor;
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

// =====================================================================
//  LISTADO Y ANULACIÓN
// =====================================================================

/** Valida los query params del listado: ?pagina&limite&desde&hasta&idUsuario&idCliente&incluirAnuladas */
export function parsearFiltrosListado(query) {
  const pagina = exigirEnteroOpcional(query.pagina, 1, 'pagina');
  let limite = exigirEnteroOpcional(query.limite, 20, 'limite');
  if (limite > 100) limite = 100;

  return {
    pagina,
    limite,
    desde: fechaOpcional(query.desde, 'desde'),
    hasta: fechaOpcional(query.hasta, 'hasta'),
    idUsuario: idOpcional(query.idUsuario, 'idUsuario'),
    idCliente: idOpcional(query.idCliente, 'idCliente'),
    incluirAnuladas: query.incluirAnuladas === 'true' || query.incluirAnuladas === '1',
  };
}

/** Valida el cuerpo de la anulación: { idUsuario, motivo? } */
export function validarAnulacion(body) {
  const b = typeof body === 'object' && body !== null ? body : {};
  return {
    idUsuario: exigirId(b.idUsuario, 'idUsuario'),
    motivo: textoOpcional(b.motivo, 'motivo', 300),
  };
}

// ---- helpers extra ----

function exigirEnteroOpcional(valor, porDefecto, campo) {
  if (valor === undefined || valor === '') return porDefecto;
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 1) {
    throw ApiError.badRequest(`El parámetro "${campo}" debe ser un entero mayor o igual a 1.`);
  }
  return n;
}

function fechaOpcional(valor, campo) {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor) || Number.isNaN(Date.parse(valor))) {
    throw ApiError.badRequest(`El parámetro "${campo}" debe tener formato YYYY-MM-DD.`);
  }
  return valor;
}