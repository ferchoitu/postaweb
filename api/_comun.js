// Lo que comparten /api/pago y /api/verificar. El prefijo `_` hace que Vercel
// no lo publique como función: sólo se importa.
//
// El precio de cara al negocio se decide en la matriz
// (docs/comercial/precios-y-oferta.md). Si difieren, gana el documento y se
// corrige acá.

const PRECIOS = { dashbox: 140000, gastro: 140000 };

const TITULOS = {
  dashbox: 'DASHBOX Stock — programa completo (pago único)',
  gastro: 'DASHBOX Gastro — programa completo (pago único)',
};

// A dónde lleva la descarga después de un pago aprobado. Son los redirects de
// vercel.json, que apuntan a la release publicada.
const DESCARGAS = { dashbox: '/instalador', gastro: '/instalador-gastro' };

const SITIO = 'https://dashbox.com.ar';

function productoValido(p) {
  return Object.prototype.hasOwnProperty.call(PRECIOS, p) ? p : null;
}

function token() {
  const t = process.env.MP_ACCESS_TOKEN;
  if (!t) throw new Error('Falta MP_ACCESS_TOKEN en las variables de entorno de Vercel');
  return t;
}

module.exports = { PRECIOS, TITULOS, DESCARGAS, SITIO, productoValido, token };
