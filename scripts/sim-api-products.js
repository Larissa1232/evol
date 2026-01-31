const { PrismaClient } = require('@prisma/client');

(async ()=>{
  const prisma = new PrismaClient();
  try{
    const produtos = await prisma.produtos.findMany({ orderBy: { id: 'asc' } });
    const products = produtos.map(p => ({
      id: p.id,
      title: p.value || p.description || `Produto ${p.id}`,
      usdt: p.price ? Number(p.price) : 0,
      brl: p.price_brl ? Number(p.price_brl) : 0,
      image: p.image || null,
      ativo: Boolean(p.ativo),
      game_item_id: p.game_item_id || null,
      send_count: p.send_count || 1
    }));
    console.log(JSON.stringify(products, null, 2));
  }catch(e){
    console.error('error', e.message || e);
  }finally{
    await prisma.$disconnect();
  }
})();
