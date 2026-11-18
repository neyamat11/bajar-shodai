require('dotenv').config({ path: __dirname + '/../.env' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('--- Starting Ultra-Fast Batch Medicine Pricing Alignment ---');

  // 1. Non-solid medicines (Syrup, Suspension, Ointment, Drop, Injection, etc.)
  const resNonSolid = await pool.query(`
    UPDATE "MedicineMeta" m
    SET "unitsPerStrip" = 1,
        "mrpUnit" = p."sellingPrice",
        "mrpStrip" = NULL,
        "updatedAt" = NOW()
    FROM "Product" p
    WHERE m."productId" = p.id
      AND NOT (
        LOWER(m."dosageForm") LIKE '%tablet%'
        OR LOWER(m."dosageForm") LIKE '%capsule%'
        OR LOWER(m."dosageForm") LIKE '%cap%'
        OR LOWER(m."dosageForm") LIKE '%tab%'
      );
  `);
  console.log(`Updated ${resNonSolid.rowCount} non-solid medicines to units=1.`);

  // 2. Oral solids with 6-count in packSizeInfo
  const res6 = await pool.query(`
    UPDATE "MedicineMeta" m
    SET "unitsPerStrip" = 6,
        "mrpStrip" = p."sellingPrice",
        "mrpUnit" = ROUND(p."sellingPrice" / 6, 2),
        "updatedAt" = NOW()
    FROM "Product" p
    WHERE m."productId" = p.id
      AND (
        LOWER(m."dosageForm") LIKE '%tablet%'
        OR LOWER(m."dosageForm") LIKE '%capsule%'
        OR LOWER(m."dosageForm") LIKE '%cap%'
        OR LOWER(m."dosageForm") LIKE '%tab%'
      )
      AND m."packSizeInfo" ~* '6\\s*(tablet|capsule|tab|cap|''s)';
  `);
  console.log(`Updated ${res6.rowCount} 6-pack oral solids.`);

  // 3. Oral solids with 4-count in packSizeInfo
  const res4 = await pool.query(`
    UPDATE "MedicineMeta" m
    SET "unitsPerStrip" = 4,
        "mrpStrip" = p."sellingPrice",
        "mrpUnit" = ROUND(p."sellingPrice" / 4, 2),
        "updatedAt" = NOW()
    FROM "Product" p
    WHERE m."productId" = p.id
      AND (
        LOWER(m."dosageForm") LIKE '%tablet%'
        OR LOWER(m."dosageForm") LIKE '%capsule%'
        OR LOWER(m."dosageForm") LIKE '%cap%'
        OR LOWER(m."dosageForm") LIKE '%tab%'
      )
      AND m."packSizeInfo" ~* '4\\s*(tablet|capsule|tab|cap|''s)';
  `);
  console.log(`Updated ${res4.rowCount} 4-pack oral solids.`);

  // 4. Standard 10-count oral solids
  const res10 = await pool.query(`
    UPDATE "MedicineMeta" m
    SET "unitsPerStrip" = 10,
        "mrpStrip" = p."sellingPrice",
        "mrpUnit" = ROUND(p."sellingPrice" / 10, 2),
        "updatedAt" = NOW()
    FROM "Product" p
    WHERE m."productId" = p.id
      AND (
        LOWER(m."dosageForm") LIKE '%tablet%'
        OR LOWER(m."dosageForm") LIKE '%capsule%'
        OR LOWER(m."dosageForm") LIKE '%cap%'
        OR LOWER(m."dosageForm") LIKE '%tab%'
      )
      AND (m."unitsPerStrip" = 10 OR m."unitsPerStrip" IS NULL);
  `);
  console.log(`Updated ${res10.rowCount} standard 10-pack oral solids.`);

  // 5. Verify Napa 500mg specifically
  const napa = await pool.query(`
    SELECT p.name, p."sellingPrice", m."unitsPerStrip", m."mrpUnit", m."mrpStrip", m."dosageForm"
    FROM "Product" p
    JOIN "MedicineMeta" m ON p.id = m."productId"
    WHERE p.name ILIKE '%napa%500%tablet%'
    LIMIT 1;
  `);
  console.log('Verification for Napa 500mg Tablet:', napa.rows[0]);

  console.log('--- Alignment Completed Successfully ---');
}

main()
  .catch((e) => console.error(e))
  .finally(() => pool.end());


