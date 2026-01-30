
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const axios = require('axios');

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

// Webhook para receber confirmação automática da OpenPix
app.post('/api/pix/webhook', async (req, res) => {
  try {
    const event = req.body;
    // Exemplo de payload: https://developers.openpix.com.br/reference/webhook
    const charge = event?.charge;
    if (!charge || !charge.correlationID) {
      return res.status(400).json({ error: 'Payload inválido' });
    }
    // correlationID = cartId
    const cartId = parseInt(charge.correlationID, 10);
    if (!cartId) return res.status(400).json({ error: 'correlationID inválido' });

    // Se status for COMPLETED, marca o carrinho como complete
    if (charge.status === 'COMPLETED') {
      await prisma.carrinho.update({
        where: { id: cartId },
        data: { status: 'complete' }
      });
      console.log(`Carrinho ${cartId} marcado como complete por webhook.`);

      // Chamada de API externa para entrega do pacote (GET)
      try {
        const carrinho = await prisma.carrinho.findUnique({ where: { id: cartId } });
        await axios.get('http://31.97.168.4/index.php', {
          params: {
            action: 'is_online',
            key: 'test',
            user_id: carrinho.user_id,
            txid: carrinho.txid
            // adicione outros campos se necessário
          }
        });
        console.log('API de entrega chamada com sucesso!');
      } catch (err) {
        console.error('Erro ao chamar API de entrega:', err.message || err);
      }
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro no webhook Pix:', err);
    res.status(500).json({ error: 'Erro no webhook', details: err.message });
  }
});

// Salvar carrinho no banco
app.post('/api/carrinho', async (req, res) => {
  try {
    const { user_id, produtos, total_usd, total_brl } = req.body;
    if (!user_id || !produtos) {
      return res.status(400).json({ error: 'user_id e produtos são obrigatórios' });
    }
    // Função para gerar txid
    function genId() {
      return Math.random().toString(36).substr(2, 10).toUpperCase();
    }
    const txid = genId();
    const carrinho = await prisma.carrinho.create({
      data: {
        user_id,
        produtos: JSON.stringify(produtos),
        total_usd: total_usd ? Number(total_usd) : null,
        total_brl: total_brl ? Number(total_brl) : null,
        status: 'pendente',
        txid: txid
      }
    });
    res.json({ id: carrinho.txid });
  } catch (err) {
    console.error('Erro ao salvar carrinho:', err);
    res.status(500).json({ error: 'Erro ao salvar carrinho', details: err.message });
  }
});

// Endpoint para gerar QR Code Pix dinâmico via OpenPix
app.post('/api/pix', async (req, res) => {
  try {
    const { value, txid, userId, description } = req.body;
    if (!value || !userId) {
      return res.status(400).json({ error: 'value e userId são obrigatórios' });
    }

    // O orderNumber é o próprio txid
    let orderNumber = null;
    if (txid) {
      orderNumber = String(txid);
    }

    // Substitua pela sua API_KEY da OpenPix
    const OPENPIX_API_KEY = process.env.OPENPIX_API_KEY || 'SUA_API_KEY_AQUI';
    const payload = {
      value: Math.round(Number(value) * 100), // OpenPix espera valor em centavos
      correlationID: txid ? String(txid) : String(Date.now()),
      comment: description || 'Pagamento via Pix',
      payer: { cpf: '', name: userId }
    };

    const response = await axios.post(
      'https://api.openpix.com.br/api/v1/charge',
      payload,
      { headers: { 'Authorization': OPENPIX_API_KEY, 'Content-Type': 'application/json' } }
    );

    const { brCode, qrcodeImage, qrCodeImage, id } = response.data.charge;
    res.json({ brCode, qrcodeImage: qrcodeImage || qrCodeImage || null, id, orderNumber, txid });
  } catch (err) {
    console.error('Erro ao gerar Pix:', err.response?.data || err.message || err);
    res.status(500).json({ error: 'Erro ao gerar Pix', details: err.response?.data || err.message });
  }
});

// simple request logger for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Simple products endpoint
app.get('/api/products', async (req, res) => {
  try {
    const produtos = await prisma.produtos.findMany({ orderBy: { id: 'asc' } });
    const products = produtos.map(p => ({
      id: p.id,
      title: p.value || p.description || `Produto ${p.id}`,
      usdt: p.price ? Number(p.price) : 0,
      brl: p.price_brl ? Number(p.price_brl) : 0,
      image: p.image || null,
      ativo: Boolean(p.ativo)
    }));
    console.log(`Returning ${products.length} products (mapped from produtos)`);
    res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'failed to fetch products' });
  }
});

app.get('/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// global error handlers to log unexpected crashes
process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at:', p, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});

const path = require('path');

// Serve build estático da pasta dist
const distPath = path.join(__dirname, 'dist');
if (require('fs').existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('/', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

async function startServer(){
  const port = process.env.API_PORT || 3000;
  try{
    console.log('Starting API server, PID:', process.pid);
    // try connecting Prisma early so connection issues fail visibly
    await prisma.$connect();
    // log datasource info (mask password) if DATABASE_URL present
    try{
      const raw = process.env.DATABASE_URL || '';
      if(raw){
        // crude parse: mysql://user:pass@host:port/db?...
        const m = raw.match(/mysql:\/\/(.*?)(?:\:(.*?)@)?(.*?)(?:\/(.*?))(?:\?|$)/);
        if(m){
          const user = m[1] || 'user';
          const host = m[3] || 'host';
          const db = m[4] || '';
          console.log(`Database config: user=${user}, host=${host}, database=${db}`);
        } else {
          console.log('Database URL present but could not parse host/db.');
        }
      } else if(process.env.MYSQL_HOST){
        console.log(`Database config from env: host=${process.env.MYSQL_HOST}, database=${process.env.MYSQL_DATABASE}`);
      } else {
        console.log('No DATABASE_URL or MYSQL_* vars found in environment.');
      }
    }catch(e){ console.warn('Failed to parse DATABASE_URL', e); }

    // quick check: count products table
    try{
      const cnt = await prisma.produtos.count();
      console.log(`Produtos in DB: ${cnt}`);
    }catch(e){
      console.warn('Could not count produtos (table may not exist):', e.message || e);
    }
    console.log('Prisma connected');

    // Serve frontend files from project root so frontend + API share port 3000
    app.use(express.static(path.join(__dirname)));
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

    // bind explicitly to 0.0.0.0 to avoid localhost/ipv6 binding issues on some Windows setups
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server listening on http://0.0.0.0:${port}`);
    });
  }catch(err){
    console.error('Failed starting server:', err);
    // keep process alive for debugging but exit after a short delay to allow logs to be read
    setTimeout(()=> process.exit(1), 5000);
  }
}

startServer();
