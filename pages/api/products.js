import prisma from '../../lib/prisma';

export default async function handler(req, res){
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const produtos = await prisma.produtos.findMany({ orderBy: { id: 'asc' } });
    const products = produtos.map(p => ({
      id: p.id,
      title: p.description || `Produto ${p.id}`,
      usdt: p.price ? Number(p.price) : 0,
      brl: p.price_brl ? Number(p.price_brl) : 0,
      image: p.image || null,
      // whether product is available
      ativo: Boolean(p.ativo),
      // message to send to the game (was description)
      message: p.description || null,
      // quantity limits
      min: p.min || 1,
      max: p.max || 1,
      // game mapping
      game_item_id: p.game_item_id || null,
      send_count: p.send_count || 1
    }));
    res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'failed to fetch products' });
  }
}
