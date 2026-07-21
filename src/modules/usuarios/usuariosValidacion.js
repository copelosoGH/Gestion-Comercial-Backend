import { ApiError } from '../../utils/apiError.js';

const ROLES_VALIDOS = ['DUENO', 'EMPLEADO'];
const MIN_PASSWORD = 6;

/** POST /api/usuarios -> { nombre, usuarioLogin, password, rol } */
export function validarNuevoUsuario(body) {
  const b = exigirObjeto(body);
  return {
    nombre: exigirTexto(b.nombre, 'nombre', 100),
    usuarioLogin: exigirTexto(b.usuarioLogin, 'usuarioLogin', 50),
    password: exigirPassword(b.password),
    rol: exigirRol(b.rol),
  };
}

/** PUT /api/usuarios/:id -> { nombre, usuarioLogin, rol, password? } */
export function validarActualizacionUsuario(body) {
  const b = exigirObjeto(body);
  return {
    nombre: exigirTexto(b.nombre, 'nombre', 100),
    usuarioLogin: exigirTexto(b.usuarioLogin, 'usuarioLogin', 50),
    rol: exigirRol(b.rol),
    password: b.password === undefined || b.password === null || b.password === ''
      ? null
      : exigirPassword(b.password),
  };
}

export function parsearFiltros(query) {
  const pagina = exigirEnteroOpcional(query.pagina, 1, 'pagina');
  let limite = exigirEnteroOpcional(query.limite, 20, 'limite');
  if (limite > 100) limite = 100;
  let busqueda = null;
  if (typeof query.busqueda === 'string' && query.busqueda.trim() !== '') busqueda = query.busqueda.trim();
  let rol = null;
  if (query.rol) rol = exigirRol(query.rol);
  return {
    pagina, limite, busqueda, rol,
    incluirInactivos: query.incluirInactivos === 'true' || query.incluirInactivos === '1',
  };
}

export function parsearIdRuta(valor) {
  return exigirId(valor, 'id');
}

// ---- helpers ----

function exigirObjeto(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw ApiError.badRequest('El cuerpo de la petición debe ser un objeto.');
  }
  return body;
}

function exigirId(valor, campo) {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) {
    throw ApiError.badRequest(`El campo "${campo}" debe ser un entero positivo.`);
  }
  return n;
}

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

function exigirPassword(valor) {
  if (typeof valor !== 'string' || valor.length < MIN_PASSWORD) {
    throw ApiError.badRequest(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
  }
  return valor;
}

function exigirRol(valor) {
  if (typeof valor !== 'string' || !ROLES_VALIDOS.includes(valor)) {
    throw ApiError.badRequest(`El campo "rol" debe ser uno de: ${ROLES_VALIDOS.join(', ')}.`);
  }
  return valor;
}

function exigirEnteroOpcional(valor, porDefecto, campo) {
  if (valor === undefined || valor === '') return porDefecto;
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 1) {
    throw ApiError.badRequest(`El parámetro "${campo}" debe ser un entero mayor o igual a 1.`);
  }
  return n;
}