async function findNaturelAndOthers() {
  const queries = [
    'Naturel',
    'Ceylon Organic Extra Virgin Coconut Oil 500',
    'Ceylon Coconut Oil 500',
    'Orchid Extra Virgin Olive Oil 500',
    'Orkide Extra Virgin Olive Oil 500',
    'Orkide Olive Oil 500'
  ];

  for (const q of queries) {
    try {
      const url = `https://eggyolk.chaldal.com/api/Product/Search?query=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const data = await res.json();
      console.log(`\n=== "${q}" ===`);
      (data.Products || []).forEach(p => {
        let rawUrl = p.PictureUrls?.[0];
        const match = rawUrl?.match(/src=([^&]+)/);
        if (match) rawUrl = decodeURIComponent(match[1]);
        if (p.Name.toLowerCase().includes('coconut') || p.Name.toLowerCase().includes('olive') || p.Name.toLowerCase().includes('naturel') || p.Name.toLowerCase().includes('ceylon') || p.Name.toLowerCase().includes('orkide') || p.Name.toLowerCase().includes('orchid')) {
          console.log(`  * ${p.Name} | ${p.SubText} | ৳${p.Price?.Lo} | ${rawUrl}`);
        }
      });
    } catch (e) {
      console.error(e.message);
    }
  }
}
findNaturelAndOthers();
