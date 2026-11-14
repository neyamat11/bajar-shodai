async function checkClariss() {
  const url = `https://eggyolk.chaldal.com/api/Product/Search?query=Clariss%20Olive`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await res.json();
  data.Products.forEach(p => {
    let rawUrl = p.PictureUrls?.[0];
    const match = rawUrl?.match(/src=([^&]+)/);
    if (match) rawUrl = decodeURIComponent(match[1]);
    console.log(`* ${p.Name} | ${p.SubText} | ৳${p.Price?.Lo} | ${rawUrl}`);
  });
}
checkClariss();
