const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

let url = process.env.DATABASE_URL.replace(/&channel_binding=[^&]*/, '').replace(/\?channel_binding=[^&]*&?/, '?');
const pool = new Pool({ connectionString: url });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const CATEGORY_ID = '1c3f5cfc-73f3-42f8-bfb3-58e186f97513'; // Cooking Oil

async function main() {
  console.log('========================================================================');
  console.log('VERIFICATION AUDIT: COOKING OIL (ভোজ্যতেল) PRODUCTS');
  console.log('========================================================================\n');

  const cat = await prisma.category.findUnique({
    where: { id: CATEGORY_ID },
    include: {
      parentCategory: true,
      products: {
        include: { images: true, unit: true, brand: true },
        orderBy: { productCode: 'asc' },
      },
    },
  });

  if (!cat) {
    console.error('ERROR: Category not found!');
    process.exit(1);
  }

  console.log(`Category: ${cat.name} (${cat.nameBn})`);
  console.log(`Slug: "${cat.slug}" | ID: ${cat.id} | DisplayOrder: ${cat.displayOrder}`);
  console.log(`Parent: ${cat.parentCategory?.name} (${cat.parentCategory?.nameBn}) [Slug: ${cat.parentCategory?.slug}]\n`);

  console.log(`Total Products Count: ${cat.products.length} (Expected: 44)\n`);

  let allChecksPassed = true;

  cat.products.forEach((p, idx) => {
    const mainImg = p.images.find(img => img.isMain) || p.images[0];
    const imgOk = mainImg?.url?.startsWith('https://');
    const zeroStockOk = Number(p.stock) === 0 && p.trackStock === false;
    const unitOk = ['bottle', 'can / tin'].includes(p.unit?.name?.toLowerCase());
    const brandOk = !!p.brand && !!p.brandName;

    if (!zeroStockOk || !unitOk || !imgOk || !brandOk) {
      allChecksPassed = false;
      console.log(`❌ FAIL on [${p.productCode}]: zeroStock=${zeroStockOk}, unit=${unitOk}, img=${imgOk}, brand=${brandOk}`);
    } else {
      console.log(
        `✓ [#${String(idx + 1).padStart(2, '0')}] [${p.productCode}] ${p.name.padEnd(46, ' ')} | Pack: ${p.packSize.padEnd(6, ' ')} | Price: ৳${String(p.sellingPrice).padEnd(5, ' ')} | Unit: ${p.unit.nameBn} | Brand: ${p.brand.name.padEnd(14, ' ')} | Img: OK`
      );
    }
  });

  console.log('\n------------------------------------------------------------------------');
  console.log(`Overall Verification Result: ${allChecksPassed && cat.products.length === 44 ? 'ALL 44 AUDIT CHECKS PASSED PERFECTLY ✓' : 'FAILED AUDIT CHECKS ✗'}`);
  console.log('------------------------------------------------------------------------\n');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
