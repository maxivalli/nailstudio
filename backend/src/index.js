import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDB } from './db/index.js';
import appointmentsRouter from './routes/appointments.js';
import galleryRouter from './routes/gallery.js';
import authRouter from './routes/auth.js';
import { initWhatsApp, getWhatsAppInfo } from './services/whatsapp.js';

dotenv.config();

process.on('uncaughtException', (err) => {
  console.error('CRASH:', err.message, err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
  process.exit(1);
});

const app = express();
const PORT = process.env.PORT || 3001;

// SSE clients store
export const sseClients = new Set();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

// SSE endpoint for real-time updates
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// Helper to broadcast to all SSE clients
export const broadcast = (event, data) => {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.write(message);
    } catch (err) {
      console.error('Error escribiendo a cliente SSE:', err);
      sseClients.delete(client);
    }
  });
};

app.use('/api/auth', authRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/gallery', galleryRouter);

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// WhatsApp status endpoint
app.get('/api/whatsapp/status', async (_, res) => {
  const info = await getWhatsAppInfo();
  res.json(info || { ready: false, provider: 'Evolution API' });
});

const start = async () => {
  await initDB();
  initWhatsApp();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

start();