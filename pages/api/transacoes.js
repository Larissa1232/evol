import prisma from '../../lib/prisma';

export default async function handler(req, res){
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const transacoes = await prisma.transacao.findMany({ orderBy: { criado_em: 'desc' } });
    res.json(transacoes);
  } catch (err) {
    console.error('Erro ao buscar transações:', err);
    res.status(500).json({ error: 'Erro ao buscar transações' });
  }
}
