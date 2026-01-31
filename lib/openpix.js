const DEFAULT_OPENPIX_URL = process.env.OPENPIX_API_URL || 'https://api.openpix.com.br/api/v1/charge';

function _fetch(...args) {
  if (typeof globalThis.fetch === 'function') return globalThis.fetch(...args);
  throw new Error('global fetch is not available in this runtime. Ensure Node 18+ or provide a fetch polyfill.');
}

function genId() {
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

async function createCharge({ amount, reference, description, expiresIn = 3600 }) {
  if (!process.env.OPENPIX_API_KEY) {
    throw new Error('OPENPIX_API_KEY not set in environment');
  }

  const OPENPIX_URL = DEFAULT_OPENPIX_URL;

  // build payload as the provider expects: `value` in cents, `correlationID`, `expiresIn`, `comment`
  // sanitize comment: remove emoji (Extended_Pictographic) and control chars, limit length
  let safeComment = description ? String(description) : '';
  try {
    safeComment = safeComment.replace(/\p{Extended_Pictographic}/gu, '');
  } catch (e) {
    // fallback for older Node versions: remove surrogate pairs (basic emoji range)
    safeComment = safeComment.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '');
  }
  // remove control chars, then restrict to printable ASCII to satisfy provider rules
  safeComment = safeComment.replace(/[\u0000-\u001F\u007F]/g, '');
  safeComment = safeComment.replace(/[^\x20-\x7E]/g, '');
  safeComment = safeComment.trim().slice(0, 200);

  // ensure correlationID contains safe chars (no emoji or exotic chars)
  const rawCorr = reference || null;
  const baseCorr = rawCorr ? String(rawCorr).replace(/[^A-Za-z0-9_\-]/g, '_') : null;
  const suffix = Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,6);
  const safeCorrelationID = (baseCorr ? (baseCorr + '_' + suffix) : genId()).slice(0, 64);

  const payload = {
    value: amount,
    correlationID: safeCorrelationID,
    expiresIn,
    comment: safeComment || undefined,
  };

  const res = await _fetch(OPENPIX_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // provider expects raw key in Authorization header (no 'Bearer ')
      Authorization: process.env.OPENPIX_API_KEY || ''
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text().catch(() => null);
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch (e) { data = text; }
  }

  if (!res.ok) {
    const err = new Error('Openpix API error');
    err.status = res.status;
    err.response = data;
    err.rawText = text;
    throw err;
  }

  // provider returns { charge: { ... } } in your snippet — normalize to return charge with raw
  if (data && data.charge) {
    return Object.assign({}, data.charge, { _raw: data });
  }

  // otherwise return whatever parsed data we got
  return data;
}

module.exports = { createCharge };
