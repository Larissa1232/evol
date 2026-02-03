import prisma from '../../../lib/prisma.js';
import { createHmac, timingSafeEqual } from 'crypto';

// helper to read raw body from Next.js pages/api request
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(data));
    req.on('error', err => reject(err));
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawText = await readRawBody(req).catch(() => null);
    const body = rawText ? JSON.parse(rawText) : req.body || {};
    const payload = body && Object.keys(body).length ? body : {};

    // If a PIX webhook secret is configured, verify HMAC header
    try {
      const pixSecret = String(process.env.PIX_WEBHOOK_SECRET || '').trim();
      const headerSig = req.headers['x-signature'] || req.headers['x-pix-signature'] || null;
      if (pixSecret) {
        if (!headerSig || !rawText) {
          console.error('[pix webhook] missing_signature_or_raw_body');
          return res.status(400).json({ error: 'missing_signature' });
        }
        const expected = createHmac('sha256', pixSecret).update(rawText).digest('hex');
        const a = Buffer.from(String(expected));
        const b = Buffer.from(String(headerSig));
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
          console.error('[pix webhook] invalid_signature');
          return res.status(400).json({ error: 'invalid_signature' });
        }
      } else {
        console.warn('[pix webhook] PIX_WEBHOOK_SECRET not set; skipping signature verification');
      }
    } catch (e) {
      console.error('[pix webhook] signature_verification_error', e);
      return res.status(400).json({ error: 'signature_verification_failed' });
    }

    // Openpix typically posts a `charge` object or the charge as the body
    const charge = payload.charge || payload;
    const correlationID = charge?.correlationID || charge?.correlationId || payload?.correlationID || payload?.txid || charge?.txid || null;

    if (!correlationID) {
      return res.status(400).json({ error: 'Missing correlationID/txid in webhook payload' });
    }

    // Find cart by txid (we use Carrinho.txid to store correlationID when creating the charge)
    const cart = await prisma.carrinho.findFirst({ where: { txid: correlationID } });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found for this correlationID' });
    }

    if (cart.status === 'completo' || cart.status === 'completed' || cart.status === 'complet') {
      return res.status(200).json({ ok: true, message: 'Cart already completed', cartId: cart.id });
    }

    // Idempotency: check if we've already processed a transaction with this correlationID
    const existingTx = await prisma.transacao.findFirst({ where: { tipo: 'pix', descricao: { contains: String(correlationID) } } });
    if (existingTx) {
      // ensure cart marked completed
      if (cart.status !== 'completo') {
        try { await prisma.carrinho.update({ where: { id: cart.id }, data: { status: 'completo' } }); } catch(e) { /* ignore */ }
      }
      return res.status(200).json({ ok: true, message: 'Webhook already processed', txId: existingTx.id });
    }

    // Update cart status to 'completo'
    await prisma.carrinho.update({ where: { id: cart.id }, data: { status: 'completo' } });

    // Create a transaction record
    const valor = cart.total_brl ?? cart.total_usd ?? 0;
    await prisma.transacao.create({
      data: {
        user_id: cart.user_id,
        valor: Number(valor),
        tipo: 'pix',
        status: 'completed',
        descricao: `PIX payment ${correlationID}`,
      },
    });

    // Attempt to deliver items by calling the GAME PHP endpoint (same logic as /api/send_item_donate)
    const GAME_PHP_URL = process.env.GAME_PHP_URL;
    const API_SECRET = process.env.API_SECRET_KEY;
    try {
      let produtosObj = null;
      try { produtosObj = JSON.parse(cart.produtos); } catch(e){ produtosObj = cart.produtos; }
      let items = [];
      let personagemId = null;
      if (Array.isArray(produtosObj)) {
        items = produtosObj;
      } else if (produtosObj && typeof produtosObj === 'object') {
        items = produtosObj.items || [];
        personagemId = produtosObj.personagem_id || produtosObj.personagemId || produtosObj.personagem || null;
      }

      if ((!personagemId) && cart && cart.user_id) {
        // fallback: try to use cart.user_id as character id (not ideal)
        personagemId = null;
      }

      const failedDeliveries = [];
      if (GAME_PHP_URL && API_SECRET && items && items.length > 0 && personagemId) {
        for (const it of items) {
          try {
            const itemId = it.game_item_id || it.itemId || it.id;

            // try to fetch product metadata to respect min/max and configured send_count
            let productRecord = null;
            try {
              const numericId = Number(itemId);
              productRecord = await prisma.produtos.findFirst({ where: { OR: [{ id: isNaN(numericId) ? undefined : numericId }, { game_item_id: isNaN(numericId) ? undefined : numericId }] } });
            } catch (e) { productRecord = null; }

            const configuredSend = productRecord?.send_count || it.send_count || 1;
            const minAllowed = productRecord?.min || it.min || 1;
            const maxAllowed = productRecord?.max || it.max || configuredSend;

            let count = configuredSend * (it.qty || 1);
            count = Math.max(minAllowed * (it.qty || 1), Math.min(count, maxAllowed * (it.qty || 1)));

            const title = 'donate';
            const message = `Compra: ${it.title || itemId}`;
            const params = new URLSearchParams({
              action: 'send_item_donate',
              char: String(personagemId),
              title: String(title),
              message: String(message),
              item: String(itemId),
              count: String(count),
              key: API_SECRET
            }).toString();
            const target = GAME_PHP_URL + (GAME_PHP_URL.includes('?') ? '&' : '?') + params;
            const r = await fetch(target, { method: 'GET', timeout: 15000 });
            if (!r.ok) {
              const text = await r.text().catch(()=>null);
              console.error('Failed to call game php for item', itemId, text);
              failedDeliveries.push({ item: itemId, reason: text || `status_${r.status}` });
            }
          } catch (e) {
            console.error('Error delivering item', e);
            failedDeliveries.push({ item: it, reason: String(e.message || e) });
          }
        }
      }

    } catch (e) {
      console.error('Delivery step failed', e);
    }

    // Optional: call external role-assignment service (e.g., your bot) if configured
    if (process.env.ROLE_ASSIGN_URL) {
      try {
        const assignRes = await fetch(process.env.ROLE_ASSIGN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.ROLE_ASSIGN_KEY ? { Authorization: process.env.ROLE_ASSIGN_KEY } : {}),
          },
          body: JSON.stringify({ user_id: cart.user_id, cart_id: cart.id, txid: correlationID }),
        });
        if (!assignRes.ok) console.error('Role assignment failed', await assignRes.text());
      } catch (e) {
        console.error('Role assignment error', e);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Webhook error', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
