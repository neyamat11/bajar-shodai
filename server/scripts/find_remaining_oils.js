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
  const specificQueries = [
    'Olio Orolio',
    'Orolio',
    'Olio Olive Oil',
    'Clariss Pomace',
    'Clariss Olive',
    'Ceylon Organic Extra Virgin',
    'Ceylon Coconut Oil',
    'Naturel Extra Virgin Coconut',
    'Naturel Organic Coconut',
    'Orchid Extra Virgin',
    'Orkide Extra Virgin',
    'Orkide Olive Oil',
    'Yeos Sesame',
    'Sesame Oil 630',
    'Yeo\'s Pure Sesame',
    'Teer Soyabean',
    'Teer 1 ltr',
    'ACI Nutrilife Rice Bran',
    'Nutrilife Rice Bran'
  ];

  for (const q of specificQueries) {
    const prods = await getProducts(q);
    console.log(`\n=== QUERY: "${q}" (${prods.length} hits) ===`);
    prods.slice(0, 10).forEach(p => {
      console.log(`  * ${p.name} | ${p.sub} | ৳${p.price} | ${p.pic}`);
    });
  }
}

run();
