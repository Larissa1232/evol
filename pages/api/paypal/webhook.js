import prisma from '../../../lib/prisma.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    const payload = body && Object.keys(body).length ? body : {};

    // PayPal webhook payload usually contains `resource` with details
    const resource = payload.resource || payload;

    // Try various places for our reference/custom id
    let correlationID = resource?.purchase_units?.[0]?.custom_id || resource?.custom_id || resource?.invoice_id || resource?.order_id || resource?.id || resource?.supplementary_data?.related_ids?.order_id || null;

    // If PayPal sent only a capture resource without custom_id, try fetching the order to read purchase_units.custom_id
    if (!correlationID) {
      // attempt to determine an order id from common fields
      const possibleOrderId = resource?.order_id || resource?.supplementary_data?.related_ids?.order_id || resource?.id || null;
      if (possibleOrderId) {
        try {
          // dynamic import to avoid ESM/CJS issues
          let paypal;
          try { paypal = (await import('../../../lib/paypal.js')); } catch(e) { paypal = require('../../../lib/paypal'); }
          const getOrder = paypal.getOrder || (paypal.default && paypal.default.getOrder) || paypal.getOrder;
          if (getOrder) {
            const orderData = await getOrder(possibleOrderId);
            const pu = orderData && orderData.purchase_units && orderData.purchase_units[0];
            correlationID = pu && (pu.custom_id || pu.reference_id) || null;
          }
        } catch (e) {
          console.warn('Could not fetch PayPal order to resolve custom_id:', e && e.message ? e.message : e);
        }
      }
    }

    if (!correlationID) {
      return res.status(400).json({ error: 'Missing correlationID/custom_id/order id in webhook payload' });
    }

    const cart = await prisma.carrinho.findFirst({ where: { txid: correlationID } });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found for this correlationID' });
    }

    if (cart.status === 'completo' || cart.status === 'completed' || cart.status === 'complet') {
      return res.status(200).json({ ok: true, message: 'Cart already completed', cartId: cart.id });
    }

    const existingTx = await prisma.transacao.findFirst({ where: { tipo: 'paypal', descricao: { contains: String(correlationID) } } });
    if (existingTx) {
      if (cart.status !== 'completo') {
        try { await prisma.carrinho.update({ where: { id: cart.id }, data: { status: 'completo' } }); } catch(e) { }
      }
      return res.status(200).json({ ok: true, message: 'Webhook already processed', txId: existingTx.id });
    }

    await prisma.carrinho.update({ where: { id: cart.id }, data: { status: 'completo' } });

    const valor = cart.total_brl ?? cart.total_usd ?? 0;
    await prisma.transacao.create({
      data: {
        user_id: cart.user_id,
        valor: Number(valor),
        tipo: 'paypal',
        status: 'completed',
        descricao: `PayPal payment ${correlationID}`,
      },
    });

    // Deliver items (same logic as pix webhook)
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
        personagemId = null;
      }

      const failedDeliveries = [];
      if (GAME_PHP_URL && API_SECRET && items && items.length > 0 && personagemId) {
        for (const it of items) {
          try {
            const itemId = it.game_item_id || it.itemId || it.id;

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
    console.error('PayPal webhook error', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
