const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');
const sharp = require('sharp');
const { randomUUID } = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const endpoint = process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const bucket = process.env.R2_BUCKET_NAME;
const publicUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

const s3 = new S3Client({
  region: 'auto',
  endpoint,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const TARGETS = [
  // --- Batch 1: Image 1 Products ---
  { code: 'OIL-01', name: 'Olitalia Italian Pomace Olive Oil 250 ml', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=125053' },
  { code: 'OIL-02', name: 'Sunshine Mustard Oil 1 L', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=122932' },
  { code: 'OIL-03', name: 'Olio Orelio Olive Oil 1 L', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=122142' },
  { code: 'OIL-04', name: 'Olio Orelio Olive Oil 750 ml', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=122139' },
  { code: 'OIL-05', name: 'Olio Orelio Olive Oil 500 ml', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=122137' },
  { code: 'OIL-06', name: 'Olio Orelio Extra Virgin Olive Oil 1 L', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=148784' },
  { code: 'OIL-07', name: 'Olio Orelio Extra Virgin Olive Oil 500 ml', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=122133' },
  { code: 'OIL-08', name: 'Clariss Olive Oil Pomace Plus 250 ml', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=93952' },
  { code: 'OIL-09', name: 'Ceylon Organic Extra Virgin Coconut Oil 200 ml', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=126645' },
  { code: 'OIL-10', name: 'Luglio Extra Virgin Olive Oil 1 L', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=74239' },
  { code: 'OIL-11', name: 'Golden Drop Sunflower Oil 5 L', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=128923' },
  { code: 'OIL-12', name: 'Ceylon Organic Extra Virgin Coconut Oil 500 ml', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=126647' },
  { code: 'OIL-13', name: 'Naturel Organic Extra Virgin Coconut Oil 500 ml', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=101800' },
  { code: 'OIL-14', name: 'Orchid Extra Virgin Olive Oil 500 ml', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=131610' },
  { code: 'OIL-15', name: 'Pran Mustard Oil 1 L', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=108370' },
  { code: 'OIL-16', name: 'Saffola Active Blended Edible Veg Oil 5 L', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=133099' },
  { code: 'OIL-17', name: "Yeo's Pure Fragrant Sesame Oil 630 ml", url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=182292' },
  { code: 'OIL-18', name: 'Fresh Mustard Oil 1 kg', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=168903' },
  { code: 'OIL-19', name: 'Pran Mustard Oil 500 ml', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=132319' },
  { code: 'OIL-20', name: 'Ambassador Spanish Olive Oil Can 150 ml', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=123301' },

  // --- Batch 2: Image 2 Products ---
  { code: 'OIL-21', name: 'Rahul Pure Mustard Oil 1 L', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=185269' },
  { code: 'OIL-22', name: "Farmer's Gold Flaxseed Oil 100 ml", url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=160664' },
  { code: 'OIL-23', name: 'La Espanola Extra Virgin Olive Oil 500 ml', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=129928' },
  { code: 'OIL-24', name: 'Fresh Fortified Soybean Oil 5 L', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=135116' },
  { code: 'OIL-25', name: 'Teer Fortified Soybean Oil 1 L', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=136109' },
  { code: 'OIL-26', name: 'Teer Fortified Soybean Oil 2 L', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=136108' },
  { code: 'OIL-27', name: 'Fresh Fortified Soybean Oil 2 L', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=135115' },
  { code: 'OIL-28', name: 'Radhuni Pure Mustard Oil 500 ml', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=132550' },
  { code: 'OIL-29', name: 'Radhuni Pure Mustard Oil 1 L', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=132549' },
  { code: 'OIL-30', name: 'Pusti Fortified Soybean Oil 1 L', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=132433' },
  { code: 'OIL-31', name: 'Fresh Rice Bran Oil 5 L', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=178229' },
  { code: 'OIL-32', name: 'Fresh Mustard Oil 500 ml', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=168881' },
  { code: 'OIL-33', name: "King's Sunflower Oil PET 5 L", url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=182967' },
  { code: 'OIL-34', name: 'ACI Nutrilife Rice Bran Oil 5 L', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=177941' },
  { code: 'OIL-35', name: 'Fortune Fortified Rice Bran Oil 5 L', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=182968' },
  { code: 'OIL-36', name: 'Orchid Sunflower Oil 5 L', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=131611' },
  { code: 'OIL-37', name: 'Eco Organic Fortified Sunflower Oil 5 L', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=163383' },
  { code: 'OIL-38', name: 'Foodela Mustard Oil 1 L', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=178464' },
  { code: 'OIL-39', name: 'Foodela Mustard Oil 500 ml', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=178462' },
  { code: 'OIL-40', name: 'Radhuni Pure Mustard Oil 2 L', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=176933' },
  { code: 'OIL-41', name: 'Starship Fortified Soybean Oil 2 L', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=174123' },
  { code: 'OIL-42', name: "Farmer's Gold Peanut Oil 100 ml", url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=160653' },
  { code: 'OIL-43', name: 'Olio Orelio Olive Oil 3 L', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=125610' },
  { code: 'OIL-44', name: 'Olio Orelio Extra Virgin Olive Oil 5 L', url: 'https://eggyolk.chaldal.com/api/Picture/Raw?pictureId=148786' },
];

async function fetchBuffer(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function processImage(inputBuffer) {
  return await sharp(inputBuffer)
    .resize(1080, 1080, { fit: 'inside', background: '#ffffff' })
    .flatten({ background: '#ffffff' })
    .extend({
      top: 60,
      bottom: 60,
      left: 60,
      right: 60,
      background: '#ffffff',
    })
    .resize(1200, 1200, { fit: 'cover', background: '#ffffff' })
    .webp({ quality: 90 })
    .toBuffer();
}

async function uploadToR2(webpBuffer, code) {
  const uuid = randomUUID();
  const r2Key = `media/products/${uuid}.webp`;
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: r2Key,
      Body: webpBuffer,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
  return `${publicUrl}/${r2Key}`;
}

async function main() {
  console.log(`Processing and uploading ${TARGETS.length} Cooking Oil image assets to Cloudflare R2...`);
  const mapping = {};

  for (let i = 0; i < TARGETS.length; i++) {
    const item = TARGETS[i];
    console.log(`[${i + 1}/${TARGETS.length}] Processing ${item.code} (${item.name})...`);
    try {
      const rawBuf = await fetchBuffer(item.url);
      const webpBuf = await processImage(rawBuf);
      const r2Url = await uploadToR2(webpBuf, item.code);
      mapping[item.code] = {
        name: item.name,
        url: r2Url,
        sizeBytes: webpBuf.length,
      };
      console.log(`   ✓ Uploaded ${item.code}: ${r2Url} (${Math.round(webpBuf.length / 1024)} KB)`);
    } catch (e) {
      console.error(`   ✗ Failed for ${item.code}:`, e.message);
    }
  }

  const outPath = path.join(__dirname, 'cooking_oil_uploaded_images.json');
  fs.writeFileSync(outPath, JSON.stringify(mapping, null, 2), 'utf8');
  console.log(`\nAll done! Successfully uploaded ${Object.keys(mapping).length}/${TARGETS.length} images to ${outPath}`);
}

main().catch(console.error);
