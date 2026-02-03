export default async function handler(req, res) {
  let createPreference;
  try {
    const mod = await import('../../../lib/mercadopago.js');
    createPreference = mod.createPreference || (mod.default && mod.default.createPreference) || mod.default || mod;
  } catch (e) {
    const mod = require('../../../lib/mercadopago');
    createPreference = mod.createPreference || mod.default || mod;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, title, description, reference, user_id, product_id, char, item } = req.body || {};
    if (typeof amount === 'undefined' || amount === null) return res.status(400).json({ error: 'Missing amount' });

    const unit_price = Number(amount) / 100;
    const prefItems = [
      {
        title: String(title || description || 'Compra'),
        quantity: 1,
        unit_price: Number(unit_price),
        currency_id: process.env.MERCADOPAGO_CURRENCY || 'BRL',
        id: product_id || undefined
      }
    ];

    const external_reference_obj = { reference: reference || null, user_id: user_id || null, product_id: product_id || null, char: char || null, item: item || null };
    const baseUrl = process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || null;
    const notification_url = baseUrl ? (baseUrl.replace(/\/$/, '') + '/api/mercadopago/webhook') : undefined;
    const back_urls = baseUrl ? { success: baseUrl, failure: baseUrl, pending: baseUrl } : undefined;

    const payload = await createPreference({
      items: prefItems,
      external_reference: JSON.stringify(external_reference_obj),
      notification_url,
      back_urls
    });

    // payload usually contains id and init_point
    return res.status(200).json({ ok: true, raw: payload, init_point: payload && (payload.init_point || payload.sandbox_init_point), preference_id: payload && payload.id });
  } catch (err) {
    console.error('MercadoPago create preference error:', err);
    const status = err && err.status ? err.status : 500;
    return res.status(status).json({ error: err.message || 'Internal error', details: err.response || null });
  }
}
