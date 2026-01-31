import prisma from '../../../lib/prisma';
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const event = req.body;
    const charge = event?.charge;
    if (!charge || !charge.correlationID) {
      return res.status(400).json({ error: 'Payload inválido' });
    }
    const cartId = parseInt(charge.correlationID, 10);
    if (!cartId) return res.status(400).json({ error: 'correlationID inválido' });

    if (charge.status === 'COMPLETED') {
      await prisma.carrinho.update({ where: { id: cartId }, data: { status: 'complete' } });
      try {
        const carrinho = await prisma.carrinho.findUnique({ where: { id: cartId } });
        await axios.get('http://31.97.168.4/index.php', {
          params: {
            action: 'is_online',
            key: 'test',
            user_id: carrinho.user_id,
            txid: carrinho.txid
          }
        });
      } catch (err) {
        console.error('Erro ao chamar API de entrega:', err.message || err);
      }
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro no webhook Pix:', err);
    res.status(500).json({ error: 'Erro no webhook', details: err.message });
  }
}
