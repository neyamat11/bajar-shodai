const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

let url = process.env.DATABASE_URL.replace(/&channel_binding=[^&]*/, '').replace(/\?channel_binding=[^&]*&?/, '?');
const pool = new Pool({ connectionString: url });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- Checking Categories under Grocery or related to Oil ---');
  const cats = await prisma.category.findMany({
    where: {
      OR: [
        { name: { contains: 'oil', mode: 'insensitive' } },
        { nameBn: { contains: 'তেল' } },
        { slug: { contains: 'oil' } },
        { parentCategoryId: 'f54d730c-5ae4-49a4-a587-f07bbc24aa17' }
      ]
    },
    include: {
      parentCategory: true,
      _count: { select: { products: true } }
    },
    orderBy: { displayOrder: 'asc' }
  });

  console.log('Categories found:', cats.length);
  cats.forEach(c => {
    console.log(`- ID: ${c.id} | Slug: ${c.slug} | Name: ${c.name} (${c.nameBn}) | Parent: ${c.parentCategory?.name || 'None'} | Products: ${c._count.products}`);
  });

  const subcats = await prisma.category.findMany({
    where: { parentCategoryId: '1c3f5cfc-73f3-42f8-bfb3-58e186f97513' }
  });
  console.log('Cooking oil subcategories count:', subcats.length);
  subcats.forEach(s => console.log(`  - ${s.name} (${s.nameBn}) [slug: ${s.slug}]`));

  const existingOilProds = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: 'oil', mode: 'insensitive' } },
        { nameBn: { contains: 'তেল' } }
      ]
    },
    select: {
      id: true,
      productCode: true,
      name: true,
      nameBn: true,
      slug: true,
      sellingPrice: true,
      categoryName: true,
      categoryId: true
    }
  });

  console.log(`\nExisting oil products count: ${existingOilProds.length}`);
  existingOilProds.slice(0, 30).forEach(p => {
    console.log(`  * [${p.productCode}] ${p.name} (${p.nameBn}) - ৳${p.sellingPrice} [Cat: ${p.categoryName}]`);
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
