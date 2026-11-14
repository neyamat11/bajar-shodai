const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

let url = process.env.DATABASE_URL.replace(/&channel_binding=[^&]*/, '').replace(/\?channel_binding=[^&]*&?/, '?');
const pool = new Pool({ connectionString: url });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const checkNames = [
  'Fresh', 'Teer', 'Radhuni', 'Pran', 'ACI Pure', 'ACI', 'Pusti', 'Fortune',
  'Olio Orelio', 'Olitalia', 'Clariss', 'Ceylon', 'Naturel', 'Orchid', 'Saffola',
  'Yeo\'s', 'Ambassador', 'Rahul', 'Farmer\'s Gold', 'La Espanola', 'King\'s',
  'Eco Organic', 'Foodela', 'Starship', 'Sunshine'
];

async function main() {
  const brands = await prisma.brand.findMany({
    where: {
      OR: checkNames.map(n => ({ name: { contains: n, mode: 'insensitive' } }))
    }
  });

  console.log(`Found ${brands.length} matching brands:`);
  brands.forEach(b => console.log(`- ID: ${b.id} | Name: ${b.name} | Slug: ${b.slug}`));
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
