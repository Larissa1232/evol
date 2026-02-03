// load environment first (supports running via `node scripts/*`)
import '../lib/loadEnv.js';
import prisma from '../lib/prisma.js';

(async ()=>{
  try{
    const produtos = await prisma.produtos.findMany({ orderBy: { id: 'asc' } });
    console.log(JSON.stringify(produtos, null, 2));
  }catch(e){
    console.error('error', e);
  }finally{
    process.exit(0);
  }
})();
