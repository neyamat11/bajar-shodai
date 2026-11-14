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
  const unitsInUse = await prisma.product.groupBy({
    by: ['unitId'],
    _count: { id: true }
  });

  const units = await prisma.unit.findMany();
  const unitMap = Object.fromEntries(units.map(u => [u.id, u]));

  console.log('Units in use across products:');
  unitsInUse.forEach(u => {
    const unit = unitMap[u.unitId];
    console.log(`- ${unit?.name || 'Unknown'} (${unit?.nameBn || '?'}) [ID: ${u.unitId}]: ${u._count.id} products`);
  });
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
