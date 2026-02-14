import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDB } from './db/index.js';
import appointmentsRouter from './routes/appointments.js';
import galleryRouter from './routes/gallery.js';
import authRouter from './routes/auth.js';
import { initWhatsApp } from './services/whatsapp.js';

dotenv.config();
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'CARGADA ✅' : 'VACÍA ❌');

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
  sseClients.forEach(client => client.write(message));
};

app.use('/api/auth', authRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/gallery', galleryRouter);

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

const start = async () => {
  await initDB();

  // Inicializar WhatsApp (Twilio)
  initWhatsApp();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📝 Admin credentials - User: ${process.env.ADMIN_USERNAME || 'admin'}`);
  });
};

start();