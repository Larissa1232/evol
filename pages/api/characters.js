import axios from 'axios';

// If you have GAME_PHP_URL and API_SECRET_KEY in .env, the handler will use them.
// Otherwise default to the example address mentioned by you.
const GAME_PHP_URL = process.env.GAME_PHP_URL || 'http://192.168.1.8/index.php';
const API_SECRET = process.env.API_SECRET_KEY || process.env.API_SECRET || 'lari';

function normalizeRoles(body){
  // body may be an object { roles: [ { roleid, rolename }, ... ] }
  if(!body) return [];
  if(typeof body === 'string'){
    try{ body = JSON.parse(body); }catch(e){ /* keep as string */ }
  }
  if(body && Array.isArray(body.roles)){
    return body.roles.map(r => ({ id: String(r.roleid || r.id || ''), name: r.rolename || r.name || '' }));
  }
  // fallback if body itself is an array
  if(Array.isArray(body)){
    return body.map(r => ({ id: String(r.roleid || r.id || ''), name: r.rolename || r.name || '' }));
  }
  return [];
}

export default async function handler(req, res){
  if(req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  try{
    const { username, user_id, char } = req.query || {};

    if(char){
      // proxy char_info for a single role
      const params = new URLSearchParams({ action: 'char_info', char: String(char), key: String(API_SECRET) }).toString();
      const target = GAME_PHP_URL + (GAME_PHP_URL.includes('?') ? '&' : '?') + params;
      const r = await axios.get(target, { timeout: 10000 });
      // return raw body (likely an object with role fields)
      return res.json(r.data);
    }

    const acct = username || user_id;
    if(!acct) return res.status(400).json({ error: 'missing_username' });

    const params = new URLSearchParams({ action: 'get_chars', username: String(acct), key: String(API_SECRET) }).toString();
    const target = GAME_PHP_URL + (GAME_PHP_URL.includes('?') ? '&' : '?') + params;
    const r = await axios.get(target, { timeout: 10000 });
    const body = r.data;
    const roles = normalizeRoles(body);
    return res.json(roles);
  }catch(err){
    console.error('characters error', err?.message || err);
    const status = err.response?.status || 500;
    const data = err.response?.data || { error: 'proxy_error', details: String(err.message || err) };
    return res.status(status).json(data);
  }
}
