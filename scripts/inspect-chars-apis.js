const urls = [
  'http://localhost:3000/api/game/get_chars',
  'http://localhost:3000/api/game/get_chars?username=test',
  'http://localhost:3000/api/php?action=get_chars',
  'http://localhost:3000/api/php?action=get_chars&username=test'
];

(async ()=>{
  for(const u of urls){
    try{
      console.log('\n== Requesting:', u);
      const res = await fetch(u, { cache: 'no-store' });
      const text = await res.text().catch(()=>null);
      console.log('Status:', res.status);
      console.log('Content-Type:', res.headers.get('content-type'));
      console.log('Body:\n', text);
    }catch(e){
      console.error('Error fetching', u, e.message||e);
    }
  }
  process.exit(0);
})();
