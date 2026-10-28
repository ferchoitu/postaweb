// GET /api/verificar?payment_id=123 → {estado, producto, monto, descarga?}
//
// /gracias lo llama con el payment_id que Mercado Pago agrega a la vuelta.
// Sin esto, cualquiera que arme la URL de /gracias a mano vería una "compra"
// y, peor, le dispararía a Ads una conversión que no existió.
//
// Sólo cuenta un pago de ESTA web (external_reference compra:...), aprobado y
// por el precio completo.

const { PRECIOS, DESCARGAS, productoValido, token } = require('./_comun');

module.exports = async (req, res) => {
  res.setHeader('cache-control', 'no-store');
  const id = String((req.query && req.query.payment_id) || '');
  if (!/^\d{6,20}$/.test(id)) return res.status(400).json({ error: 'payment_id inválido' });

  let resp;
  try {
    resp = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
  } catch (e) {
    console.error('[verificar] no se pudo llamar a MP:', e.message);
    return res.status(502).json({ error: 'No pudimos verificar el pago' });
  }
  if (resp.status === 404) return res.status(404).json({ error: 'Pago no encontrado' });
  if (!resp.ok) {
    console.error('[verificar] MP respondió', resp.status, await resp.text());
    return res.status(502).json({ error: 'No pudimos verificar el pago' });
  }

  const pago = await resp.json();
  const partes = String(pago.external_reference || '').split(':');
  const producto = partes[0] === 'compra' ? productoValido(partes[1]) : null;
  if (!producto) return res.status(404).json({ error: 'Pago no encontrado' });

  const monto = Number(pago.transaction_amount) || 0;
  const aprobado = pago.status === 'approved' && monto >= PRECIOS[producto];
  const estado = aprobado ? 'aprobado' : ['pending', 'in_process', 'authorized'].includes(pago.status) ? 'pendiente' : 'rechazado';

  return res.status(200).json({
    estado,
    producto,
    monto,
    descarga: aprobado ? DESCARGAS[producto] : null,
  });
};
