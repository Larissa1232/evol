import axios from 'axios';

const GAME_PHP_URL = process.env.GAME_PHP_URL;
const API_SECRET = process.env.API_SECRET_KEY;

function toFormBody(obj){
  return new URLSearchParams(obj).toString();
}

export default async function handler(req, res){
  if (!GAME_PHP_URL || !API_SECRET) {
    return res.status(500).json({ error: 'server_misconfigured', message: 'Set GAME_PHP_URL and API_SECRET_KEY in .env' });
  }

  const { action } = req.query;
  if (!action) return res.status(400).json({ error: 'missing action' });

  // Preserve original querystring and ensure key is present
  const params = new URLSearchParams(req.query);
  params.set('key', API_SECRET);

  const targetUrl = GAME_PHP_URL + (GAME_PHP_URL.includes('?') ? '&' : '?') + params.toString();

  try {
    let response;
    if (req.method === 'GET') {
      response = await axios.get(targetUrl, { timeout: 10000 });
    } else {
      // For non-GET, forward body as form merged with query params
      const bodyParams = new URLSearchParams({ ...Object.fromEntries(params), ...req.body }).toString();
      response = await axios({
        method: req.method,
        url: GAME_PHP_URL,
        data: bodyParams,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000
      });
    }

    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      return res.status(response.status).json(response.data);
    }

    // Attempt to parse if string looks like JSON, otherwise send raw text
    if (typeof response.data === 'string') {
      try { return res.status(response.status).json(JSON.parse(response.data)); } catch (e) { return res.status(response.status).send(response.data); }
    }

    return res.status(response.status).json(response.data);
  } catch (err) {
    const details = err.response?.data || err.message;
    return res.status(err.response?.status || 500).json({ error: 'proxy_error', details });
  }
}
