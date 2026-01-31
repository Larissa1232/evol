import prisma from '../../lib/prisma';

export default async function handler(req, res){
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const produtos = await prisma.produtos.findMany({ orderBy: { id: 'asc' } });
    const products = produtos.map(p => ({
      id: p.id,
      title: p.value || p.description || `Produto ${p.id}`,
      usdt: p.price ? Number(p.price) : 0,
      brl: p.price_brl ? Number(p.price_brl) : 0,
      image: p.image || null,
      ativo: Boolean(p.ativo)
    }));
    res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'failed to fetch products' });
  }
}
