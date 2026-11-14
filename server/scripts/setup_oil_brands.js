const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

let url = process.env.DATABASE_URL.replace(/&channel_binding=[^&]*/, '').replace(/\?channel_binding=[^&]*&?/, '?');
const pool = new Pool({ connectionString: url });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const BRANDS = [
  { name: 'Olitalia', slug: 'olitalia' },
  { name: 'Sunshine', slug: 'sunshine' },
  { name: 'Olio Orelio', slug: 'olio-orelio' },
  { name: 'Clariss', slug: 'clariss' },
  { name: 'Ceylon', slug: 'ceylon' },
  { name: 'Luglio', slug: 'luglio' },
  { name: 'Golden Drop', slug: 'golden-drop' },
  { name: 'Naturel', slug: 'naturel' },
  { name: 'Orchid', slug: 'orchid' },
  { name: 'Pran', slug: 'pran' },
  { name: 'Saffola', slug: 'saffola' },
  { name: "Yeo's", slug: 'yeos' },
  { name: 'Fresh', slug: 'fresh' },
  { name: 'Ambassador', slug: 'ambassador' },
  { name: 'Rahul', slug: 'rahul' },
  { name: "Farmer's Gold", slug: 'farmers-gold' },
  { name: 'La Espanola', slug: 'la-espanola' },
  { name: 'Teer', slug: 'teer' },
  { name: 'Radhuni', slug: 'radhuni' },
  { name: 'Pusti', slug: 'pusti' },
  { name: "King's", slug: 'kings' },
  { name: 'ACI Nutrilife', slug: 'aci-nutrilife' },
  { name: 'Fortune', slug: 'fortune' },
  { name: 'Eco Organic', slug: 'eco-organic' },
  { name: 'Foodela', slug: 'foodela' },
  { name: 'Starship', slug: 'starship' },
];

async function main() {
  console.log('Ensuring all 26 cooking oil brands exist in Brand table...');
  const brandMap = {};

  for (const b of BRANDS) {
    let brand = await prisma.brand.findFirst({
      where: {
        OR: [
          { slug: b.slug },
          { name: { equals: b.name, mode: 'insensitive' } },
        ],
      },
    });

    if (!brand) {
      brand = await prisma.brand.create({
        data: {
          name: b.name,
          slug: b.slug,
          status: 'ACTIVE',
        },
      });
      console.log(`+ Created brand: ${b.name} (${brand.id})`);
    } else {
      console.log(`= Existing brand: ${brand.name} (${brand.id})`);
    }
    brandMap[b.name] = brand.id;
  }

  const outPath = path.join(__dirname, 'oil_brands_map.json');
  require('fs').writeFileSync(outPath, JSON.stringify(brandMap, null, 2), 'utf8');
  console.log('Saved brand map to:', outPath);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
