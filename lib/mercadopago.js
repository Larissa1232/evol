// ensure .env is loaded when this module runs under plain Node
try{ require('./loadEnv'); }catch(e){}

const DEFAULT_MP_API = process.env.MERCADOPAGO_API_URL || 'https://api.mercadopago.com';

function _fetch(...args) {
  if (typeof globalThis.fetch === 'function') return globalThis.fetch(...args);
  throw new Error('global fetch is not available in this runtime. Ensure Node 18+ or provide a fetch polyfill.');
}

function _getToken() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN || process.env.MP_TOKEN;
  if (!token) throw new Error('MERCADOPAGO_ACCESS_TOKEN (or MP_ACCESS_TOKEN) not set in environment');
  return token;
}

async function createPreference({ items = [], payer = undefined, external_reference = undefined, notification_url = undefined, back_urls = undefined, payment_methods = undefined }) {
  if (!Array.isArray(items) || items.length === 0) throw new Error('Missing items array');
  const token = _getToken();
  const url = DEFAULT_MP_API + '/checkout/preferences';

  const payload = {
    items,
    payer,
  };
  if (external_reference) payload.external_reference = external_reference;
  if (notification_url) payload.notification_url = notification_url;
  if (back_urls) payload.back_urls = back_urls;
  if (payment_methods) payload.payment_methods = payment_methods;

  const res = await _fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const text = await res.text().catch(()=>null);
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch(e){ data = text; }
  }
  if (!res.ok) {
    const err = new Error('Mercado Pago create preference error');
    err.status = res.status;
    err.response = data;
    throw err;
  }
  return data;
}

async function getPayment(paymentId) {
  if (!paymentId) throw new Error('Missing paymentId');
  const token = _getToken();
  const url = DEFAULT_MP_API + '/v1/payments/' + encodeURIComponent(paymentId);
  const res = await _fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  const text = await res.text().catch(()=>null);
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch(e){ data = text; }
  }
  if (!res.ok) {
    const err = new Error('Mercado Pago get payment error');
    err.status = res.status;
    err.response = data;
    throw err;
  }
  return data;
}

module.exports = { createPreference, getPayment };
