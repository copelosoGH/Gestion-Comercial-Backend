import { query } from '../../config/db.js';

function construirFiltros({ busqueda, conDeuda, incluirInactivos }) {
  const condiciones = [];
  const params = [];

  if (!incluirInactivos) condiciones.push('activo = TRUE');
  if (busqueda) {
    params.push(`%${busqueda}%`);
    const i = params.length;
    condiciones.push(`(nombre ILIKE $${i} OR dni_cuit ILIKE $${i})`);
  }
  if (conDeuda) condiciones.push('saldo_cuenta_corriente > 0');

  const clausula = condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : '';
  return { clausula, params };
}

export async function listarClientes({ busqueda, conDeuda, incluirInactivos, limite, offset }) {
  const { clausula, params } = construirFiltros({ busqueda, conDeuda, incluirInactivos });
  const pLimite = params.length + 1;
  const pOffset = params.length + 2;
  const sql = `
    SELECT
      id_cliente AS "idCliente",
      nombre,
      dni_cuit   AS "dniCuit",
      telefono,
      direccion,
      limite_credito::float          AS "limiteCredito",
      saldo_cuenta_corriente::float  AS "saldo",
      activo
    FROM cliente
    ${clausula}
    ORDER BY nombre
    LIMIT $${pLimite} OFFSET $${pOffset}
  `;
  const { rows } = await query(sql, [...params, limite, offset]);
  return rows;
}

export async function contarClientes(filtros) {
  const { clausula, params } = construirFiltros(filtros);
  const { rows } = await query(`SELECT COUNT(*)::int AS total FROM cliente ${clausula}`, params);
  return rows[0].total;
}

export async function obtenerClientePorId(idCliente) {
  const { rows } = await query(
    `SELECT
       id_cliente AS "idCliente",
       nombre,
       dni_cuit   AS "dniCuit",
       telefono,
       direccion,
       limite_credito::float          AS "limiteCredito",
       saldo_cuenta_corriente::float  AS "saldo",
       activo,
       creado_en AS "creadoEn"
     FROM cliente
     WHERE id_cliente = $1`,
    [idCliente],
  );
  return rows[0] ?? null;
}

export async function crearCliente(datos) {
  const { rows } = await query(
    `INSERT INTO cliente (nombre, dni_cuit, telefono, direccion, limite_credito)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id_cliente AS "idCliente"`,
    [datos.nombre, datos.dniCuit, datos.telefono, datos.direccion, datos.limiteCredito],
  );
  return rows[0].idCliente;
}

/** Actualiza datos del cliente. NO toca el saldo de cuenta corriente. */
export async function actualizarCliente(idCliente, datos) {
  await query(
    `UPDATE cliente
       SET nombre = $2,
           dni_cuit = $3,
           telefono = $4,
           direccion = $5,
           limite_credito = $6
     WHERE id_cliente = $1`,
    [idCliente, datos.nombre, datos.dniCuit, datos.telefono, datos.direccion, datos.limiteCredito],
  );
}

export async function darDeBajaCliente(idCliente) {
  await query('UPDATE cliente SET activo = FALSE WHERE id_cliente = $1', [idCliente]);
}