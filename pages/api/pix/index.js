import axios from 'axios';

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { value, txid, userId, description } = req.body;
    if (!value || !userId) return res.status(400).json({ error: 'value e userId são obrigatórios' });

    let orderNumber = null;
    if (txid) orderNumber = String(txid);

    const OPENPIX_API_KEY = process.env.OPENPIX_API_KEY || 'SUA_API_KEY_AQUI';
    const payload = {
      value: Math.round(Number(value) * 100),
      correlationID: txid ? String(txid) : String(Date.now()),
      comment: description || 'Pagamento via Pix',
      payer: { cpf: '', name: userId }
    };

    const response = await axios.post('https://api.openpix.com.br/api/v1/charge', payload, {
      headers: { 'Authorization': OPENPIX_API_KEY, 'Content-Type': 'application/json' }
    });

    const { brCode, qrcodeImage, qrCodeImage, id } = response.data.charge;
    res.json({ brCode, qrcodeImage: qrcodeImage || qrCodeImage || null, id, orderNumber, txid });
  } catch (err) {
    console.error('Erro ao gerar Pix:', err.response?.data || err.message || err);
    res.status(500).json({ error: 'Erro ao gerar Pix', details: err.response?.data || err.message });
  }
}
