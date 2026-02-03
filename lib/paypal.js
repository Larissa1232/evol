const DEFAULT_PAYPAL_API = process.env.PAYPAL_API_URL || (process.env.PAYPAL_MODE === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com');

function _fetch(...args) {
  if (typeof globalThis.fetch === 'function') return globalThis.fetch(...args);
  throw new Error('global fetch is not available in this runtime. Ensure Node 18+ or provide a fetch polyfill.');
}

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error('PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET not set in environment');

  const tokenUrl = DEFAULT_PAYPAL_API + '/v1/oauth2/token';
  const basic = Buffer.from(`${clientId}:${secret}`).toString('base64');

  const res = await _fetch(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const json = await res.json().catch(()=>null);
  if (!res.ok) {
    const err = new Error('PayPal token error');
    err.status = res.status;
    err.response = json;
    throw err;
  }
  return json.access_token;
}

// amount is expected in cents (integer) to match the frontend behaviour used for Pix
async function createCharge({ amount, reference, description, currency = (process.env.PAYPAL_CURRENCY || 'BRL') }) {
  if (typeof amount === 'undefined' || amount === null) throw new Error('Missing amount');
  const token = await getAccessToken();
  const url = DEFAULT_PAYPAL_API + '/v2/checkout/orders';

  const value = (Number(amount) / 100).toFixed(2);

  const payload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: { currency_code: currency, value },
        custom_id: reference ? String(reference).slice(0,127) : undefined,
        description: description ? String(description).slice(0,127) : undefined
      }
    ],
    application_context: {
      brand_name: process.env.PAYPAL_BRAND_NAME || 'Evol',
      user_action: 'PAY_NOW'
    }
  };

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
    try { data = JSON.parse(text); } catch(e) { data = text; }
  }

  if (!res.ok) {
    const err = new Error('PayPal create order error');
    err.status = res.status;
    err.response = data;
    err.rawText = text;
    throw err;
  }

  // normalize to an object similar to other providers
  const orderID = data && (data.id || null);
  let approveUrl = null;
  if (Array.isArray(data.links)) {
    const l = data.links.find(x => x.rel === 'approve' || x.rel === 'payer-action');
    if (l) approveUrl = l.href;
  }

  return Object.assign({}, {
    orderID,
    approveUrl,
    currency,
    value,
    reference,
  }, { _raw: data });
}

async function getOrder(orderId) {
  if (!orderId) throw new Error('Missing orderId');
  const token = await getAccessToken();
  const url = DEFAULT_PAYPAL_API + '/v2/checkout/orders/' + encodeURIComponent(orderId);
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
    try { data = JSON.parse(text); } catch(e) { data = text; }
  }
  if (!res.ok) {
    const err = new Error('PayPal get order error');
    err.status = res.status;
    err.response = data;
    err.rawText = text;
    throw err;
  }
  return data;
}

module.exports = { createCharge, getOrder };

