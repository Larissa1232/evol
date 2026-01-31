const { PrismaClient } = require('@prisma/client');

(async ()=>{
  const prisma = new PrismaClient();
  try{
    const produtos = await prisma.produtos.findMany({ orderBy: { id: 'asc' } });
    console.log(JSON.stringify(produtos, null, 2));
  }catch(e){
    console.error('error', e.message || e);
  }finally{
    await prisma.$disconnect();
  }
})();
