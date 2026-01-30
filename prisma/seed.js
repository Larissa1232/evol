const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

const PRODUCTS = [
  { title: 'Pack 1$', usdt: 0.20, brl: 1.04 },
  { title: 'Pack 3$', usdt: 2.55, brl: 13.26 },
  { title: 'Pack 5$', usdt: 4.25, brl: 22.10 },
  { title: 'Pack 10$', usdt: 7.50, brl: 39.01 },
  { title: 'Pack 30$', usdt: 22.50, brl: 117.02 },
  { title: 'Pack 50$', usdt: 39.00, brl: 202.84 },
];

async function main(){
  const count = await prisma.produtos.count();
  if(count > 0){
    console.log(`Produtos table already has ${count} records — skipping seed.`);
    return;
  }

  console.log('Seeding products...');
  const seedData = PRODUCTS.map(p => ({
    value: p.title,
    price: p.usdt.toString(),
    price_brl: p.brl.toString(),
    description: p.title,
    min: 1,
    max: 1,
    ativo: true
  }));

  await prisma.produtos.createMany({ data: seedData });
  const newCount = await prisma.produtos.count();
  console.log(`Seed complete — ${newCount} produtos in DB.`);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
