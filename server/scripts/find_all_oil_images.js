async function getProducts(query) {
  try {
    const url = `https://eggyolk.chaldal.com/api/Product/Search?query=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.Products || []).map(p => {
      let rawUrl = p.PictureUrls?.[0];
      const match = rawUrl?.match(/src=([^&]+)/);
      if (match) rawUrl = decodeURIComponent(match[1]);
      return {
        id: p.ProductVariantId,
        name: p.Name,
        sub: p.SubText,
        pic: rawUrl,
        price: p.Price?.Lo
      };
    });
  } catch (err) {
    return [];
  }
}

async function run() {
  const queries = [
    'Soyabean Oil',
    'Fresh Soyabean Oil',
    'Teer Soyabean Oil',
    'Pusti Soyabean Oil',
    'Starship Soyabean Oil',
    'Rice Bran Oil',
    'Fresh Rice Bran Oil',
    'ACI Nutrilife',
    'Fortune Rice Bran',
    'Clariss Olive Oil',
    'Clariss',
    'Orelio',
    'Olio',
    'Ceylon Organic',
    'Naturel Coconut Oil',
    'Orchid Olive Oil',
    'Orchid Sunflower Oil',
    'Yeos Sesame',
    'Sesame Oil',
    'Flaxseed Oil',
    'Peanut Oil',
    'Sunflower Oil',
    'Eco Organic',
    'Mustard Oil'
  ];

  for (const q of queries) {
    const prods = await getProducts(q);
    console.log(`\n=== QUERY: "${q}" (${prods.length} hits) ===`);
    prods.forEach(p => {
      const n = (p.name + ' ' + (p.sub || '')).toLowerCase();
      if (n.includes('oil') || n.includes('soyabean') || n.includes('mustard') || n.includes('olive') || n.includes('sunflower') || n.includes('coconut') || n.includes('bran') || n.includes('sesame') || n.includes('flaxseed') || n.includes('peanut')) {
        console.log(`  * ${p.name} | ${p.sub} | ৳${p.price} | ${p.pic}`);
      }
    });
  }
}

run();
