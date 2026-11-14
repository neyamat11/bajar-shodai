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
  const units = await prisma.unit.findMany();
  console.log('Units in DB:');
  units.forEach(u => console.log(`- ID: ${u.id} | name: ${u.name} | nameBn: ${u.nameBn} | allowDecimal: ${u.allowDecimal} | step: ${u.step}`));

  const brands = await prisma.brand.findMany({
    orderBy: { name: 'asc' }
  });
  console.log(`\nBrands in DB (${brands.length}):`);
  brands.forEach(b => console.log(`- ID: ${b.id} | name: ${b.name} | slug: ${b.slug}`));
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
