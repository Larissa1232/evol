import prisma from '../../lib/prisma';

export default async function handler(req, res){
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { user_id } = req.query || {};
    const options = user_id ? { where: { user_id: String(user_id) }, orderBy: { criado_em: 'desc' } } : { orderBy: { criado_em: 'desc' } };
    const transacoes = await prisma.transacao.findMany(options);
    res.json(transacoes);
  } catch (err) {
    console.error('Erro ao buscar transações:', err);
    res.status(500).json({ error: 'Erro ao buscar transações' });
  }
}
