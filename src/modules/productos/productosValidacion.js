import { ApiError } from '../../utils/apiError.js';

const LIMITE_DEFECTO = 20;
const LIMITE_MAXIMO = 100;

/**
 * Valida y normaliza los query params del listado:
 *   ?pagina=1&limite=20&busqueda=texto&idRubro=3
 */
export function parsearFiltrosListado(query) {
  const pagina = parsearEnteroPositivo(query.pagina, 1, 'pagina');

  let limite = parsearEnteroPositivo(query.limite, LIMITE_DEFECTO, 'limite');
  if (limite > LIMITE_MAXIMO) limite = LIMITE_MAXIMO;

  let idRubro = null;
  if (query.idRubro !== undefined && query.idRubro !== '') {
    idRubro = parsearId(query.idRubro, 'idRubro');
  }

  let busqueda = null;
  if (typeof query.busqueda === 'string' && query.busqueda.trim() !== '') {
    busqueda = query.busqueda.trim();
  }

  return { pagina, limite, idRubro, busqueda };
}

/** Valida que un valor sea un entero positivo (ids de ruta o de filtro). */
export function parsearId(valor, campo = 'id') {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) {
    throw ApiError.badRequest(`El parámetro "${campo}" debe ser un entero positivo.`);
  }
  return n;
}

// Helper interno.
function parsearEnteroPositivo(valor, porDefecto, campo) {
  if (valor === undefined || valor === '') return porDefecto;
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 1) {
    throw ApiError.badRequest(`El parámetro "${campo}" debe ser un entero mayor o igual a 1.`);
  }
  return n;
}

// ===================== VALIDACIÓN DE EDICIÓN =====================

const MAX_DESCRIPCION_PRODUCTO = 150;
const MAX_DESCRIPCION_VARIANTE = 180;

/**
 * Valida el cuerpo del PUT /api/productos/:id
 * Estructura esperada: { descripcion, idRubro, idSubrubro?, idMarca?, variantes?: [...] }
 */
export function validarActualizacionProducto(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw ApiError.badRequest('El cuerpo de la petición debe ser un objeto.');
  }

  const descripcion = exigirTexto(body.descripcion, 'descripcion', MAX_DESCRIPCION_PRODUCTO);
  const idRubro = parsearId(body.idRubro, 'idRubro');
  const idSubrubro = idOpcional(body.idSubrubro, 'idSubrubro');
  const idMarca = idOpcional(body.idMarca, 'idMarca');

  let variantes = [];
  if (body.variantes !== undefined && body.variantes !== null) {
    if (!Array.isArray(body.variantes)) {
      throw ApiError.badRequest('"variantes" debe ser un arreglo.');
    }
    variantes = body.variantes.map((v, i) => validarVarianteEdicion(v, i));
  }

  return { descripcion, idRubro, idSubrubro, idMarca, variantes };
}

/** Valida una variante a editar (debe traer su idVariante). */
export function validarVarianteEdicion(item, indice = 0) {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) {
    throw ApiError.badRequest(`La variante #${indice + 1} debe ser un objeto.`);
  }
  return {
    idVariante: parsearId(item.idVariante, `variantes[${indice}].idVariante`),
    descripcion: exigirTexto(item.descripcion, `variantes[${indice}].descripcion`, MAX_DESCRIPCION_VARIANTE),
    fragancia: textoOpcional(item.fragancia, `variantes[${indice}].fragancia`, 60),
    dimension: textoOpcional(item.dimension, `variantes[${indice}].dimension`, 60),
    presentacion: textoOpcional(item.presentacion, `variantes[${indice}].presentacion`, 60),
    simulaA: textoOpcional(item.simulaA, `variantes[${indice}].simulaA`, 80),
    codigoBarras: textoOpcional(item.codigoBarras, `variantes[${indice}].codigoBarras`, 50),
    precioCosto: exigirNumeroNoNegativo(item.precioCosto, `variantes[${indice}].precioCosto`),
    precioVenta: exigirNumeroNoNegativo(item.precioVenta, `variantes[${indice}].precioVenta`),
    stockMinimoTotal: exigirNumeroNoNegativo(item.stockMinimoTotal, `variantes[${indice}].stockMinimoTotal`),
    unidadVenta: exigirTexto(item.unidadVenta, `variantes[${indice}].unidadVenta`, 20),
    unidadesPorCaja: exigirEnteroPositivo(item.unidadesPorCaja, `variantes[${indice}].unidadesPorCaja`),
  };
}

// ---- helpers de validación ----

function exigirTexto(valor, campo, maxLargo) {
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw ApiError.badRequest(`El campo "${campo}" es obligatorio.`);
  }
  const limpio = valor.trim();
  if (limpio.length > maxLargo) {
    throw ApiError.badRequest(`El campo "${campo}" supera el largo máximo (${maxLargo}).`);
  }
  return limpio;
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

function idOpcional(valor, campo) {
  if (valor === undefined || valor === null || valor === '') return null;
  return parsearId(valor, campo);
}

// ===================== VALIDACIÓN DE ALTA =====================

/**
 * Valida el cuerpo del POST /api/productos (alta anidada).
 * { descripcion, idRubro, idSubrubro?, idMarca?, variante: { ... } }
 */
export function validarNuevoProducto(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw ApiError.badRequest('El cuerpo de la petición debe ser un objeto.');
  }

  const descripcion = exigirTexto(body.descripcion, 'descripcion', MAX_DESCRIPCION_PRODUCTO);
  const idRubro = parsearId(body.idRubro, 'idRubro');
  const idSubrubro = idOpcional(body.idSubrubro, 'idSubrubro');
  const idMarca = idOpcional(body.idMarca, 'idMarca');

  if (typeof body.variante !== 'object' || body.variante === null || Array.isArray(body.variante)) {
    throw ApiError.badRequest('Se requiere el objeto "variante" para dar de alta el producto.');
  }
  const variante = validarVarianteNueva(body.variante);
  // Si no se cargó descripción de la variante, toma la del producto.
  if (variante.descripcion === null) variante.descripcion = descripcion;

  return { descripcion, idRubro, idSubrubro, idMarca, variante };
}

/** Valida una variante nueva (sin idVariante), con defaults amables. */
export function validarVarianteNueva(item) {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) {
    throw ApiError.badRequest('La variante debe ser un objeto.');
  }
  return {
    descripcion: textoOpcional(item.descripcion, 'variante.descripcion', MAX_DESCRIPCION_VARIANTE),
    fragancia: textoOpcional(item.fragancia, 'variante.fragancia', 60),
    dimension: textoOpcional(item.dimension, 'variante.dimension', 60),
    presentacion: textoOpcional(item.presentacion, 'variante.presentacion', 60),
    simulaA: textoOpcional(item.simulaA, 'variante.simulaA', 80),
    codigoBarras: textoOpcional(item.codigoBarras, 'variante.codigoBarras', 50),
    precioCosto: numeroNoNegativoConDefecto(item.precioCosto, 'variante.precioCosto', 0),
    precioVenta: numeroNoNegativoConDefecto(item.precioVenta, 'variante.precioVenta', 0),
    stockMinimoTotal: numeroNoNegativoConDefecto(item.stockMinimoTotal, 'variante.stockMinimoTotal', 0),
    unidadVenta: textoConDefecto(item.unidadVenta, 'variante.unidadVenta', 20, 'UNIDAD'),
    unidadesPorCaja: enteroPositivoConDefecto(item.unidadesPorCaja, 'variante.unidadesPorCaja', 1),
  };
}

// ---- helpers con valor por defecto (para el alta) ----

function numeroNoNegativoConDefecto(valor, campo, porDefecto) {
  if (valor === undefined || valor === null || valor === '') return porDefecto;
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0) {
    throw ApiError.badRequest(`El campo "${campo}" debe ser un número mayor o igual a 0.`);
  }
  return n;
}

function enteroPositivoConDefecto(valor, campo, porDefecto) {
  if (valor === undefined || valor === null || valor === '') return porDefecto;
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 1) {
    throw ApiError.badRequest(`El campo "${campo}" debe ser un entero mayor o igual a 1.`);
  }
  return n;
}

function textoConDefecto(valor, campo, maxLargo, porDefecto) {
  const limpio = textoOpcional(valor, campo, maxLargo);
  return limpio === null ? porDefecto : limpio;
}