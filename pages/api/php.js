import axios from 'axios';

export default async function handler(req, res){
  try {
    const phpUrl = 'http://192.168.1.9/index.php';
    const response = await axios({
      method: req.method,
      url: phpUrl,
      params: req.query,
      data: req.body,
      headers: { 'Content-Type': req.headers['content-type'] || 'application/json' },
      timeout: 10000,
    });
    res.status(response.status).send(response.data);
  } catch (err) {
    console.error('Error proxying /api/php:', err.message || err);
    if (err.response && err.response.data) return res.status(500).json(err.response.data);
    res.status(500).json({ error: err.message || 'proxy error' });
  }
}
