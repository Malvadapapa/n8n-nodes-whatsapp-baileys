import express from 'express';
import cors from 'cors';
import { BaileysManager } from './baileys-manager';
import { createQRRouter } from './routes/qr';
import { createStatusRouter } from './routes/status';
import { createSendRouter } from './routes/send';
import { createWebhookRouter } from './routes/webhook';

const PORT = parseInt(process.env.BRIDGE_PORT || '3100', 10);
const API_KEY = process.env.BRIDGE_API_KEY || '';

const app = express();
const manager = new BaileysManager();

// ─── Middleware ──────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Optional API key authentication
if (API_KEY) {
  app.use((req, res, next) => {
    // Skip auth for QR page (convenience)
    if (req.path === '/qr/page') return next();

    const authHeader = req.headers['x-api-key'] || req.query.apiKey;
    if (authHeader !== API_KEY) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }
    next();
  });
}

// ─── Routes ─────────────────────────────────────────────────────────────
app.use('/qr', createQRRouter(manager));
app.use('/status', createStatusRouter(manager));
app.use('/send', createSendRouter(manager));
app.use('/webhook', createWebhookRouter(manager));

// Session & Activity routes
app.post('/logout', async (req, res) => {
  try {
    await manager.logout();
    res.json({ success: true, message: 'Sesión cerrada y credenciales eliminadas. Generando nuevo QR.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/activity', (req, res) => {
  res.json({ logs: manager.getActivityLogs() });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Root info
app.get('/', (req, res) => {
  res.json({
    name: 'WhatsApp Baileys Bridge',
    version: '1.0.0',
    endpoints: {
      'GET /qr': 'Get QR code as PNG image',
      'GET /qr/raw': 'Get QR code as JSON string',
      'GET /qr/page': 'Auto-refreshing QR page for scanning',
      'GET /status': 'Get connection status',
      'POST /send/text': 'Send text message',
      'POST /send/image': 'Send image message',
      'POST /send/document': 'Send document',
      'POST /send/location': 'Send location',
      'POST /send/contact': 'Send contact card',
      'POST /send/reply': 'Reply to a message',
      'POST /webhook/register': 'Register webhook URL',
      'GET /webhook': 'List registered webhooks',
      'DELETE /webhook/:id': 'Remove a webhook',
      'GET /health': 'Health check',
    },
  });
});

// ─── Start ──────────────────────────────────────────────────────────────
async function start() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║       WhatsApp Baileys Bridge for n8n           ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  // Start Express server
  app.listen(PORT, () => {
    console.log(`🚀 Bridge server running on http://localhost:${PORT}`);
    console.log(`📱 Scan QR code at: http://localhost:${PORT}/qr/page`);
    console.log(`📊 Check status at: http://localhost:${PORT}/status`);
    console.log('');
  });

  // Connect to WhatsApp
  console.log('🔌 Connecting to WhatsApp...');
  await manager.connect();
}

start().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
