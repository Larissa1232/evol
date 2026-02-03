import prisma from '../../lib/prisma';
import axios from 'axios';

const GAME_PHP_URL = process.env.GAME_PHP_URL;
const API_SECRET = process.env.API_SECRET_KEY;

// Minimal finalize function: mark carrinho as paid, create transacao and attempt delivery when possible.
export async function finalizeCarrinhoOrder(opts) {
  const { orderNumber, paidAmountBRL, provider, providerPaymentId, rawPayload, payerEmail, cardFirstSix, cardLastFour, requireManualReview } = opts || {};
  if (!orderNumber) throw new Error('missing_orderNumber');

  // Find carrinho by order_number or txid
  const rows = await prisma.$queryRawUnsafe('SELECT * FROM carrinho WHERE (order_number = ? OR txid = ?) LIMIT 1', String(orderNumber), String(orderNumber));
  const row = rows && rows[0];
  if (!row) throw new Error('carrinho_not_found');

  const carrinhoId = row.id;

  // create transacao record (idempotent check by providerPaymentId)
  try {
    const exists = await prisma.transacao.findFirst({ where: { descricao: String(providerPaymentId) } });
    if (!exists) {
      await prisma.transacao.create({ data: {
        user_id: String(row.user_id || 'unknown'),
        valor: String(Number(paidAmountBRL || 0)),
        tipo: provider || 'mercadopago',
        status: requireManualReview ? 'review' : 'approved',
        descricao: String(providerPaymentId || '')
      }});
    }
  } catch (e) {
    console.warn('finalizeCarrinhoOrder: could not create transacao', e && e.message);
  }

  // update carrinho status
  try {
    await prisma.carrinho.update({ where: { id: Number(carrinhoId) }, data: { status: 'paid', txid: String(providerPaymentId || orderNumber) } });
  } catch (e) {
    console.warn('finalizeCarrinhoOrder: could not update carrinho', e && e.message);
  }

  // attempt delivery if GAME_PHP_URL is configured
  if (GAME_PHP_URL && API_SECRET) {
    try {
      // try to parse produtos field to find item/char info
      let produtos = null;
      try { produtos = typeof row.produtos === 'string' ? JSON.parse(row.produtos) : row.produtos; } catch { produtos = null; }

      if (Array.isArray(produtos) && produtos.length > 0) {
        for (const p of produtos) {
          const char = p.char || row.user_id || '';
          const item = p.item || p.product_id || p.id || '';
          const count = p.count || p.send_count || 1;
          if (!item) continue;
          const params = new URLSearchParams({ action: 'send_item_donate', char: String(char), title: String(orderNumber), message: String(orderNumber), item: String(item), count: String(count), key: API_SECRET }).toString();
          const target = GAME_PHP_URL + (GAME_PHP_URL.includes('?') ? '&' : '?') + params;
          try { await axios.get(target, { timeout: 15000 }); } catch (e) { console.warn('finalizeCarrinhoOrder: delivery request failed', e && (e.response?.data || e.message)); }
        }
      }
    } catch (e) {
      console.warn('finalizeCarrinhoOrder: delivery error', e && e.message);
    }
  }

  return { ok: true };
}
