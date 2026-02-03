export default async function handler(req, res) {
  let createCharge;
  try {
    const mod = await import('../../../lib/paypal.js');
    createCharge = mod.createCharge || (mod.default && (mod.default.createCharge || mod.default));
  } catch (e) {
    const mod = require('../../../lib/paypal');
    createCharge = mod.createCharge || mod.default || mod;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, reference, description } = req.body;
    if (!amount) return res.status(400).json({ error: 'Missing amount' });

    const payload = await createCharge({ amount, reference, description });
    const charge = payload && payload._raw ? payload : (payload?.orderID ? payload : payload);

    const out = { ok: true, raw: payload };
    const orderNumber = charge?.orderID || charge?.id || payload?.id || null;
    const txid = orderNumber;
    const approveUrl = payload?.approveUrl || (payload?._raw && payload._raw.links && payload._raw.links.find(l=>l.rel==='approve')?.href) || null;

    out.orderNumber = orderNumber;
    out.txid = txid;
    out.approveUrl = approveUrl;
    out.data = { orderNumber, txid, approveUrl };

    return res.status(200).json(out);
  } catch (err) {
    console.error('PayPal create order error:', err);
    const status = err && err.status ? err.status : 500;
    return res.status(status).json({ error: err.message || 'Internal error', details: err.response || null });
  }
}
