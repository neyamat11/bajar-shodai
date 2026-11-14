async function inspectHtml() {
  const res = await fetch('https://chaldal.com/oil', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  const html = await res.text();
  // check for egg or picture or img
  const eggMatches = html.match(/eggyolk[^\s"']+/g);
  console.log('eggyolk matches:', eggMatches?.slice(0, 5));

  const imgMatches = html.match(/https:\/\/[^\s"']+\.(?:png|jpg|jpeg|webp)/g);
  console.log('img matches count:', imgMatches?.length);
  console.log('sample img matches:', imgMatches?.slice(0, 10));

  // Also check if there's window.__INITIAL_STATE__ or json scripts
  const scripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
  console.log('Script tags count:', scripts?.length);
  for (const s of (scripts || [])) {
    if (s.includes('Fresh Fortified') || s.includes('Teer Fortified') || s.includes('Radhuni')) {
      console.log('Found brand in script tag! Length:', s.length);
      // look for image links or pictureId
      const pics = s.match(/"pictureId":\s*(\d+)/g) || s.match(/Picture\/Raw\?pictureId=(\d+)/g);
      console.log('pics found in script:', pics?.slice(0, 10));
      break;
    }
  }
}
inspectHtml();
