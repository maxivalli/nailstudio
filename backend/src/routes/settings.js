import { Router } from 'express';
import { pool } from '../db/index.js';
import { authMiddleware } from '../controllers/auth.js';

const router = Router();

// GET /api/settings/maintenance — público, para que el calendario sepa si está activo
router.get('/maintenance', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT value FROM settings WHERE key = $1`,
      ['maintenance_mode']
    );
    const msgResult = await pool.query(
      `SELECT value FROM settings WHERE key = $1`,
      ['maintenance_message']
    );
    res.json({
      success: true,
      data: {
        active: result.rows[0]?.value === 'true',
        message: msgResult.rows[0]?.value || 'Estamos de vacaciones 🌴 Volvemos pronto.',
      },
    });
  } catch (err) {
    console.error('Error obteniendo modo mantenimiento:', err.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor.' });
  }
});

// PUT /api/settings/maintenance — solo admin
router.put('/maintenance', authMiddleware, async (req, res) => {
  const { active, message } = req.body;

  if (typeof active !== 'boolean') {
    return res.status(400).json({ success: false, error: 'El campo "active" debe ser booleano.' });
  }

  try {
    await pool.query(
      `INSERT INTO settings (key, value, updated_at)
       VALUES ('maintenance_mode', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [active ? 'true' : 'false']
    );

    if (message !== undefined) {
      const cleanMessage = String(message).trim().slice(0, 300);
      await pool.query(
        `INSERT INTO settings (key, value, updated_at)
         VALUES ('maintenance_message', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [cleanMessage]
      );
    }

    res.json({ success: true, data: { active, message } });
  } catch (err) {
    console.error('Error actualizando modo mantenimiento:', err.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor.' });
  }
});

export default router;
