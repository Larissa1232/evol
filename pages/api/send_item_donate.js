import axios from 'axios';

const GAME_PHP_URL = process.env.GAME_PHP_URL;
const API_SECRET = process.env.API_SECRET_KEY;

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!GAME_PHP_URL || !API_SECRET) {
    return res.status(500).json({ error: 'server_misconfigured', message: 'Set GAME_PHP_URL and API_SECRET_KEY in .env' });
  }

  const { char, item, count = 1, title = 'donate', message = 'donate' } = req.body || {};
  if (!char || !item) return res.status(400).json({ error: 'missing_parameters' });

  const params = new URLSearchParams({
    action: 'send_item_donate',
    char: String(char),
    title: String(title),
    message: String(message),
    item: String(item),
    count: String(count),
    key: API_SECRET
  }).toString();

  const target = GAME_PHP_URL + (GAME_PHP_URL.includes('?') ? '&' : '?') + params;

  try {
    const r = await axios.get(target, { timeout: 15000 });
    const contentType = r.headers['content-type'] || '';
    if (typeof r.data === 'string' && contentType.includes('application/json')) {
      try { return res.status(r.status).json(JSON.parse(r.data)); } catch(e){}
    }
    return res.status(r.status).send(r.data);
  } catch (err) {
    const details = err.response?.data || err.message;
    return res.status(err.response?.status || 500).json({ error: 'proxy_error', details });
  }
}
