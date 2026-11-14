async function searchItems() {
  const words = ['Clariss', 'Ceylon', 'Naturel', 'Orkide', 'Orchid', 'Yeo', 'Teer', 'Nutrilife', 'ACI Rice'];
  for (const w of words) {
    try {
      const url = `https://eggyolk.chaldal.com/api/Product/Search?query=${encodeURIComponent(w)}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const data = await res.json();
      console.log(`\n=== "${w}" (${data.Products?.length || 0}) ===`);
      (data.Products || []).forEach(p => {
        let rawUrl = p.PictureUrls?.[0];
        const match = rawUrl?.match(/src=([^&]+)/);
        if (match) rawUrl = decodeURIComponent(match[1]);
        console.log(`  * ${p.Name} | ${p.SubText} | ৳${p.Price?.Lo} | ${rawUrl}`);
      });
    } catch (e) {
      console.error(e.message);
    }
  }
}
searchItems();
