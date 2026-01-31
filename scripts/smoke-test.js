const axios = require('axios');

const BASE = 'http://localhost:3000';

async function run(){
  const endpoints = [
    { method: 'get', path: '/api/health' },
    { method: 'get', path: '/api/products' },
    { method: 'get', path: '/api/transacoes' },
    { method: 'post', path: '/api/carrinho', data: { nome: 'Teste', items: [] } },
    { method: 'get', path: '/api/game?action=is_online' }
  ];

  for(const e of endpoints){
    const url = BASE + e.path;
    try{
      const r = await axios({ method: e.method, url, data: e.data, timeout: 5000 });
      console.log('===', e.method.toUpperCase(), e.path, '->', r.status);
      if(typeof r.data === 'object') console.log(JSON.stringify(r.data,null,2)); else console.log(r.data);
    }catch(err){
      console.log('===', e.method.toUpperCase(), e.path, '-> ERROR');
      if(err.response) console.log('Status:', err.response.status, 'Data:', err.response.data);
      else console.log(err.message);
    }
    console.log('');
  }
}

run();
