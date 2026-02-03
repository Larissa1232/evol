import { createHmac } from 'crypto';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { requireWebhookEnabled } from '../../../lib/webhookGuard';
import { finalizeCarrinhoOrder } from '../../../lib/payments/finalizeCarrinhoOrder';
import prisma from '../../../lib/prisma';

const WEBHOOK_DEBUG = String(process.env.WEBHOOK_DEBUG || '').trim() === '1';

function maskEmail(email) {
  if (!email) return undefined;
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const shown = local.length <= 2 ? local : local.slice(0, 2);
  return `${shown}***@${domain}`;
}

async function fetchPaymentDetails(paymentId) {
  const token = String(process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim();
  if (!token) throw new Error('missing_mercadopago_access_token');
  const url = `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json().catch(() => null);
  if (res.ok) return json;

  if (String(paymentId).startsWith('ORD-')) {
    const moUrl = `https://api.mercadopago.com/merchant_orders/${encodeURIComponent(paymentId)}`;
    const moRes = await fetch(moUrl, { headers: { Authorization: `Bearer ${token}` } });
    const moJson = await moRes.json().catch(() => null);
    if (moRes.ok && moJson && Array.isArray(moJson.payments) && moJson.payments.length > 0) {
      const firstPayment = moJson.payments[0];
      const resolvedPaymentId = firstPayment?.id || firstPayment?.payment_id || null;
      if (resolvedPaymentId) {
        const pRes = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(resolvedPaymentId)}`, { headers: { Authorization: `Bearer ${token}` } });
        const pJson = await pRes.json().catch(() => null);
        if (pRes.ok) return pJson;
      }
    }
    const err = new Error('mp_fetch_failed');
    err.status = moRes?.status || res.status;
    err.body = moJson || json;
    throw err;
  }

  const err = new Error('mp_fetch_failed');
  err.status = res.status;
  err.body = json;
  throw err;
}

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
  const blocked = requireWebhookEnabled('MERCADOPAGO');
  if (blocked) return res.status(blocked.status || 403).json(blocked.body || { error: 'webhooks_disabled' });

  try {
    const rawText = await readRawBody(req).catch(() => null);

    if (WEBHOOK_DEBUG) {
      try {
        const logsDir = path.join(process.cwd(), 'tmp', 'logs');
        if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
        const rawLog = path.join(logsDir, 'mercadopago_webhook_raw.log');
        const headersObj = {};
        try { for (const k in req.headers) headersObj[k] = req.headers[k]; } catch {}
        const entry = { ts: new Date().toISOString(), headers: headersObj, body: rawText };
        try { fs.appendFileSync(rawLog, JSON.stringify(entry) + '\n'); } catch (e) { console.error('[mercadopago webhook] failed_append_raw_log', e); }
      } catch (e) { console.error('[mercadopago webhook] failed_write_raw_log', e); }
    }

    let body = null;
    try { body = rawText ? JSON.parse(rawText) : req.body || null; } catch { body = req.body || null; }

    const paymentId = body?.data?.id || body?.id || body?.payment_id || req.query?.id || req.query?.payment_id || null;
    if (!paymentId) return res.status(400).json({ error: 'missing_payment_id' });

    // If webhook contains our internal order identifier (ORD-...), resolve locally
    if (String(paymentId).startsWith('ORD-')) {
      try {
        // try to find by order_number or txid
        const rows = await prisma.$queryRawUnsafe('SELECT total_brl FROM carrinho WHERE (order_number = ? OR txid = ?) LIMIT 1', String(paymentId), String(paymentId));
        const row = rows && rows[0];
        if (!row) {
          console.warn('[mercadopago webhook] ord_not_found_in_db', { paymentId });
          return res.json({ ok: true });
        }
        const expectedBRL = Number(row.total_brl);
        if (!Number.isFinite(expectedBRL) || expectedBRL <= 0) {
          console.error('[mercadopago webhook] invalid_expected_total_for_ord', { paymentId, expectedBRL });
          return res.json({ ok: true });
        }

        try {
          await finalizeCarrinhoOrder({
            orderNumber: String(paymentId),
            paidAmountBRL: expectedBRL,
            provider: 'mercadopago',
            providerPaymentId: String(paymentId),
            rawPayload: body || null
          });
        } catch (e) {
          console.error('[mercadopago webhook] finalize_by_order_number_error', { paymentId, err: e });
        }

        return res.json({ ok: true });
      } catch (e) {
        console.error('[mercadopago webhook] ord_processing_error', e);
        return res.json({ ok: true });
      }
    }

    let details = null;
    try {
      details = await fetchPaymentDetails(String(paymentId));
    } catch (err) {
      const errObj = (err && typeof err === 'object') ? err : { message: String(err) };
      console.error('[mercadopago webhook] fetchPaymentDetails_error', { paymentId, err: errObj });
      return res.status(502).json({ error: 'mp_fetch_failed' });
    }

    const paidAmount = (typeof details.transaction_amount === 'number' && details.transaction_amount) || (details.transaction_details && details.transaction_details.total_paid_amount) || null;
    const externalReferenceRaw = details.external_reference || (details.additional_info && details.additional_info.items && details.additional_info.items[0] && details.additional_info.items[0].external_reference) || null;

    if (!externalReferenceRaw || !paidAmount) {
      console.error('[mercadopago webhook] missing external_reference or amount', { details });
      return res.json({ ok: true });
    }

    let orderNumber = String(externalReferenceRaw);
    const parts = orderNumber.split(':');
    if (parts.length === 2) {
      const providedSig = parts.pop();
      orderNumber = parts.join(':');
      const secret = String(process.env.MERCADOPAGO_WEBHOOK_SECRET || process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim();
      if (!secret) {
        console.error('[mercadopago webhook] missing webhook secret');
        return res.json({ ok: true });
      }
      const expected = createHmac('sha256', secret).update(orderNumber).digest('hex').slice(0, 16);
      if (!expected || expected !== providedSig) {
        console.error('[mercadopago webhook] invalid_signature', { orderNumber, providedSig, expected });
        return res.status(400).json({ error: 'invalid_signature' });
      }
    }

    const paidBRL = Number(paidAmount);

    try {
      if (String(details.status || '').toLowerCase() !== 'approved') {
        console.warn('[mercadopago webhook] payment not approved, ignoring', { paymentId, status: details.status });
        return res.json({ ok: true });
      }

      const expectedMerchant = String(process.env.MERCADOPAGO_MERCHANT_ID || '').trim();
      if (expectedMerchant) {
        const collectorId = String(details.collector_id || (details.merchant_order && details.merchant_order.collector_id) || '');
        if (collectorId && collectorId !== expectedMerchant) {
          console.error('[mercadopago webhook] collector_id_mismatch', { paymentId, collectorId, expectedMerchant });
          return res.status(400).json({ error: 'collector_mismatch' });
        }
      }

      const payerEmail = details.payer && details.payer.email ? details.payer.email : null;
      const cardFirstSix = details.card && (details.card.first_six_digits || details.card.first_six) ? (details.card.first_six_digits || details.card.first_six) : null;
      const cardLastFour = details.card && (details.card.last_four_digits || details.card.last_four) ? (details.card.last_four_digits || details.card.last_four) : null;

      try {
        const logsDir = path.join(process.cwd(), 'tmp', 'logs');
        if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
        const logFile = path.join(logsDir, 'mercadopago_payments.log');
        const limitedDetails = {
          status: details.status || null,
          transaction_amount: details.transaction_amount || (details.transaction_details && details.transaction_details.total_paid_amount) || null,
          external_reference: details.external_reference || null,
          collector_id: details.collector_id || (details.merchant_order && details.merchant_order.collector_id) || null
        };
        const entry = { ts: new Date().toISOString(), orderNumber, paymentId: String(paymentId), paidBRL, payerEmail: maskEmail(payerEmail), cardFirstSix: cardFirstSix || null, cardLastFour: cardLastFour || null, details: limitedDetails };
        fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
      } catch (e) { console.error('[mercadopago webhook] failed_to_write_log', e); }

      const autoReleaseLimit = Number(process.env.MERCADOPAGO_AUTORELEASE_LIMIT_BRL || '1000');
      const requireReview = Number.isFinite(autoReleaseLimit) && paidBRL > autoReleaseLimit;
      if (requireReview) {
        console.warn('[mercadopago webhook] payment requires manual review due to amount', { orderNumber, paidBRL, autoReleaseLimit });
        await finalizeCarrinhoOrder({ orderNumber, paidAmountBRL: paidBRL, provider: 'mercadopago', providerPaymentId: String(paymentId), rawPayload: details, payerEmail, cardFirstSix, cardLastFour, requireManualReview: true });
        return res.json({ ok: true, review: true });
      }

      await finalizeCarrinhoOrder({ orderNumber, paidAmountBRL: paidBRL, provider: 'mercadopago', providerPaymentId: String(paymentId), rawPayload: details, payerEmail, cardFirstSix, cardLastFour });
    } catch (e) {
      console.error('[mercadopago webhook] processing_error', e);
      return res.status(500).json({ error: e?.message || 'processing_error' });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error('[mercadopago webhook] error', e);
    return res.status(500).json({ error: e?.message || 'webhook_error' });
  }
}
