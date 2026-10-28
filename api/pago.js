// POST /api/pago — body JSON {producto, nombre, telefono, email} → {url}
//
// Crea la preferencia de Mercado Pago y devuelve el link del checkout.
// Reemplaza a la función `licencias/pago` de Supabase (proyecto pausado
// desde 2026-10): no hay base propia, el registro de la compra es el pago
// mismo en Mercado Pago, con el contacto en `metadata`.
//
// El contacto viaja por body y nunca por query: las URLs quedan en logs.

const { PRECIOS, TITULOS, SITIO, productoValido, token } = require('./_comun');

const limpio = (v) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 200) : '');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const producto = productoValido(String(b.producto || ''));
  if (!producto) return res.status(400).json({ error: 'producto inválido' });

  const nombre = limpio(b.nombre);
  const telefono = limpio(b.telefono);
  const email = limpio(b.email);
  if (nombre.length < 3 || telefono.replace(/\D/g, '').length < 8 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'Faltan datos de contacto' });
  }

  // compra:<producto>:<id>. El id sólo sirve para encontrar el pago en el
  // panel de MP; no activa nada (los programas ya no tienen licencia).
  const id = Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
  const referencia = `compra:${producto}:${id}`;

  let resp;
  try {
    resp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        items: [
          { id: producto, title: TITULOS[producto], quantity: 1, currency_id: 'ARS', unit_price: PRECIOS[producto] },
        ],
        payer: { name: nombre, email },
        external_reference: referencia,
        metadata: { producto, nombre, telefono, email },
        // MP le agrega ?payment_id&status&external_reference a la vuelta;
        // /gracias verifica el pago contra /api/verificar antes de dar la descarga.
        back_urls: {
          success: `${SITIO}/gracias`,
          pending: `${SITIO}/gracias`,
          failure: `${SITIO}/comprar?pago=fallo${producto === 'gastro' ? '&producto=gastro' : ''}`,
        },
        auto_return: 'approved',
        statement_descriptor: 'DASHBOX',
      }),
    });
  } catch (e) {
    console.error('[pago] no se pudo llamar a MP:', e.message);
    return res.status(502).json({ error: 'No se pudo iniciar el pago. Escribinos por WhatsApp.' });
  }

  if (!resp.ok) {
    console.error('[pago] MP rechazó la preferencia:', resp.status, await resp.text());
    return res.status(502).json({ error: 'No se pudo iniciar el pago. Escribinos por WhatsApp.' });
  }
  const pref = await resp.json();
  return res.status(200).json({ url: pref.init_point });
};
