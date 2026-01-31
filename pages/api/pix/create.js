export default async function handler(req, res) {
  // dynamic import to avoid module ESM/CJS interop issues during server startup
  let createCharge;
  try {
    const mod = await import('../../../lib/openpix.js');
    createCharge = mod.createCharge || (mod.default && (mod.default.createCharge || mod.default));
  } catch (e) {
    // fallback to require for CommonJS environments
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../../../lib/openpix');
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
    // payload may already be the `charge` object (our helper returns charge with _raw),
    // or a raw object — normalize to `charge` variable
    const charge = payload && payload._raw && payload._raw.charge ? payload : (payload?.charge ? payload.charge : payload);

    const out = { ok: true, raw: payload };
    const orderNumber = charge?.transactionID || charge?.identifier || charge?.paymentLinkID || charge?.id || payload?.correlationID || null;
    const brCode = charge?.brCode || charge?.br_code || charge?.paymentMethods?.pix?.brCode || payload?.brCode || null;
    const qrcodeImage = charge?.qrCodeImage || charge?.qrCode || charge?.qrCodeImage || charge?.paymentMethods?.pix?.qrCodeImage || payload?.qrCodeImage || null;

    out.orderNumber = orderNumber;
    out.brCode = brCode;
    out.qrcodeImage = qrcodeImage;
    // include a `data` key so frontend parsing prefers the normalized payload
    out.data = { orderNumber, brCode, qrcodeImage };

    return res.status(200).json(out);
  } catch (err) {
    console.error('Openpix create charge error:', err);
    const status = err && err.status ? err.status : 500;
    return res.status(status).json({ error: err.message || 'Internal error', details: err.response || null });
  }
}
