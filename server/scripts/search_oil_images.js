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
  const testQueries = [
    'Fresh Soybean Oil',
    'Teer Soybean Oil',
    'Radhuni Mustard Oil',
    'Pran Mustard Oil',
    'Olio Orelio',
    'Olitalia Olive Oil',
    'Sunshine Mustard Oil',
    'King\'s Sunflower Oil',
    'Saffola Active',
    'ACI Nutrilife Rice Bran',
    'Fortune Rice Bran',
    'Pusti Soybean Oil',
    'Clariss Olive Oil',
    'Ceylon Organic Coconut Oil',
    'Naturel Organic Coconut Oil',
    'Orchid Sunflower Oil',
    'Farmer\'s Gold',
    'Foodela Mustard Oil',
    'Yeo\'s Sesame Oil',
    'Starship Soybean Oil',
    'Luglio Olive Oil',
    'Golden Drop Sunflower Oil',
    'Ambassador Olive Oil',
    'Rahul Mustard Oil',
    'La Espanola Olive Oil',
    'Eco Organic Sunflower Oil'
  ];

  for (const q of testQueries) {
    const prods = await getProducts(q);
    console.log(`\n=== QUERY: "${q}" (${prods.length} hits) ===`);
    prods.slice(0, 5).forEach(p => {
      console.log(`  * ${p.name} | ${p.sub} | ৳${p.price} | ${p.pic}`);
    });
  }
}

run();
