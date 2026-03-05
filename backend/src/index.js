import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initDB } from './db/index.js';
import appointmentsRouter from './routes/appointments.js';
import galleryRouter from './routes/gallery.js';
import chatRouter from './routes/chat.js';
import servicesRouter from './routes/services.js';
import authRouter from './routes/auth.js';
import { initWhatsApp, getWhatsAppInfo } from './services/whatsapp.js';
import { authMiddleware, authMiddlewareSSE } from './controllers/auth.js';
import { initScheduler } from './services/scheduler.js';
import { generalLimiter, loginLimiter } from './middleware/rateLimits.js';

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
const SSE_MAX_CLIENTS = 100;

app.set('trust proxy', 1);

// ─── Security middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '10kb' }));
app.use('/api/', generalLimiter);

// ─── SSE clients — separados por tipo ────────────────────────────────────────
export const ssePublicClients = new Set(); // calendario público (solo señal de cambio)
export const sseAdminClients = new Set();  // panel admin (eventos completos, requiere auth)

// SSE público — sin auth, solo dispara recarga de disponibilidad
app.get('/api/events', (req, res) => {
  if (ssePublicClients.size >= SSE_MAX_CLIENTS) {
    return res.status(503).json({ error: 'Demasiadas conexiones activas.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  ssePublicClients.add(res);
  req.on('close', () => ssePublicClients.delete(res));
});

// SSE admin — requiere token JWT como query param (?token=...)
// EventSource del browser no soporta headers custom
app.get('/api/events/admin', authMiddlewareSSE, (req, res) => {
  if (sseAdminClients.size >= SSE_MAX_CLIENTS) {
    return res.status(503).json({ error: 'Demasiadas conexiones activas.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseAdminClients.add(res);
  req.on('close', () => sseAdminClients.delete(res));
});

// ─── Broadcast helpers ────────────────────────────────────────────────────────

// Broadcast a admins: datos completos del turno
export const broadcast = (event, data) => {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseAdminClients.forEach(client => {
    try {
      client.write(message);
    } catch (err) {
      console.error('Error escribiendo a cliente SSE admin:', err);
      sseAdminClients.delete(client);
    }
  });
};

// Broadcast público: solo señal de "hubo un cambio", sin datos personales
export const broadcastPublic = (event) => {
  const message = `event: ${event}\ndata: {}\n\n`;
  ssePublicClients.forEach(client => {
    try {
      client.write(message);
    } catch (err) {
      ssePublicClients.delete(client);
    }
  });
};

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use('/api/auth', loginLimiter, authRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/gallery', galleryRouter);
app.use('/api/chat', chatRouter);
app.use('/api/services', servicesRouter);

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

app.get('/api/whatsapp/status', authMiddleware, async (_, res) => {
  const info = await getWhatsAppInfo();
  res.json(info || { ready: false, provider: 'Evolution API' });
});

// ─── Arranque ─────────────────────────────────────────────────────────────────
const start = async () => {
  await initDB();
  initWhatsApp();
  initScheduler();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

start();