export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // OpenPix support was removed. Return 410 to indicate the endpoint is gone.
  return res.status(410).json({ error: 'openpix_removed', message: 'OpenPix support has been removed from this project. Use another PIX provider.' });
}
