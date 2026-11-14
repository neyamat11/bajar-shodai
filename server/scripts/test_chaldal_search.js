async function testSearch() {
  const query = 'oil';
  try {
    const res = await fetch('https://catalog.chaldal.com/search5', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      body: JSON.stringify({
        apiKey: 'e964177b7894a86a6358',
        storeId: 1,
        warehouseId: 1,
        pageSize: 10,
        pageIndex: 0,
        query: 'mustard oil'
      })
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Result count:', data.hits?.length || data.page?.length || Object.keys(data));
    if (data.page) {
      data.page.slice(0, 3).forEach(p => {
        console.log(`- ${p.name} | ৳${p.price} | pic: ${p.pictureId}`);
      });
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testSearch();
