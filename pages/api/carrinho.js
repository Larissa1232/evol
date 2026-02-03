import prisma from '../../lib/prisma';

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { user_id, produtos, total_usd, total_brl } = req.body;
    if (typeof user_id === 'undefined' || user_id === null || !produtos) return res.status(400).json({ error: 'user_id e produtos são obrigatórios' });

    function genId(){ return Math.random().toString(36).substr(2,10).toUpperCase(); }
    const txid = genId();
    const uid = String(user_id);
    const carrinho = await prisma.carrinho.create({
      data: {
        user_id: uid,
        produtos: JSON.stringify(produtos),
        total_usd: total_usd ? Number(total_usd) : null,
        total_brl: total_brl ? Number(total_brl) : null,
        status: 'pendente',
        txid: txid
      }
    });
    res.json({ id: carrinho.txid });
  } catch (err) {
    console.error('Erro ao salvar carrinho:', err);
    res.status(500).json({ error: 'Erro ao salvar carrinho', details: err.message });
  }
}
