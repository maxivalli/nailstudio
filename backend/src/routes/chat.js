import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { pool } from '../db/index.js';

const router = Router();

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : 200,
  message: { success: false, error: 'Demasiados mensajes. Esperá un momento.' },
});

const buildSystemPrompt = async () => {
  const result = await pool.query(
    'SELECT name, price, category FROM services WHERE active = true ORDER BY sort_order ASC, id ASC'
  );

  const byCategory = result.rows.reduce((acc, s) => {
    const cat = s.category || 'servicio';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(`- ${s.name}: $${s.price.toLocaleString('es-AR')}`);
    return acc;
  }, {});

  const servicesList = Object.entries(byCategory)
    .map(([cat, items]) => `${cat.toUpperCase()}:\n${items.join('\n')}`)
    .join('\n\n');

  return `Sos la asistente virtual de SY Studio, un salón de manicuria premium. Tu nombre es Luna.
Respondés en español, con un tono cálido, elegante y cercano — como una amiga que sabe de uñas.
Sos concisa: no más de 3 oraciones por respuesta salvo que sea necesario.

SERVICIOS Y PRECIOS de SY Studio:
${servicesList}

ATIENDE: Sofía Ybarra
¿TRABAJAN A DOMICILIO?: No, solo atendemos en nuestro salón.
¿TRABAJAN SIN TURNO?: No, solo atendemos con turno previo.
INSTAGRAM: @systudio
HORARIOS: Lunes a sábado, 8:00 a 20:00. Turnos de 2 horas.
TURNOS: Se sacan desde la web, en la sección "Sacar turno".
UBICACIÓN: San Cristóbal, Santa Fe, Argentina. La dirección exacta se confirma al sacar el turno.
WHATSAPP: +5493408680476

Si te preguntan algo que no sabés, decí amablemente que pueden escribir por Instagram o WhatsApp.
No inventes precios ni servicios que no estén en la lista.`;
};

router.post('/', chatLimiter, async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ success: false, error: 'Mensajes inválidos.' });
  }

  // Limitar historial a los últimos 10 mensajes y truncar contenido largo
  const MAX_MESSAGES = 10;
  const MAX_CONTENT_LENGTH = 500;
  const safeMessages = messages
    .slice(-MAX_MESSAGES)
    .map(m => ({
      role: m.role === 'user' || m.role === 'assistant' ? m.role : 'user',
      content: String(m.content || '').slice(0, MAX_CONTENT_LENGTH),
    }))
    .filter(m => m.content.length > 0);

  if (safeMessages.length === 0) {
    return res.status(400).json({ success: false, error: 'Mensajes inválidos.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'API key no configurada.' });
  }

  try {
    const systemPrompt = await buildSystemPrompt();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: systemPrompt,
        messages: safeMessages,
      }),
    });

    const data = await response.json();
    const reply = data.content?.[0]?.text;

    if (!reply) {
      console.error('Anthropic response:', JSON.stringify(data));
      return res.status(500).json({ success: false, error: 'Sin respuesta del modelo.' });
    }

    res.json({ success: true, reply });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ success: false, error: 'Error de conexión.' });
  }
});

export default router;