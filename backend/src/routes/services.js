import { Router } from 'express';
import { pool } from '../db/index.js';
import { authMiddleware } from '../controllers/auth.js';
import { invalidatePromptCache } from './chat.js';

const router = Router();

// GET /api/services — público, para el chatbot y la web
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, price, category FROM services WHERE active = true ORDER BY sort_order ASC, id ASC'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error obteniendo servicios:', err.message);
    res.status(500).json({ success: false, error: 'Error obteniendo servicios.' });
  }
});

// POST /api/services — solo admin
router.post('/', authMiddleware, async (req, res) => {
  const { name, price, category } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, error: 'Nombre requerido.' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO services (name, price, category) VALUES ($1, $2, $3) RETURNING *',
      [name, price ? parseInt(price) : null, category || 'servicio']
    );
    invalidatePromptCache();
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error creando servicio:', err.message);
    res.status(500).json({ success: false, error: 'Error creando servicio.' });
  }
});

// PUT /api/services/:id — solo admin
router.put('/:id', authMiddleware, async (req, res) => {
  const { name, price, category, active } = req.body;
  try {
    // price puede ser null explícitamente para borrarlo
    const priceValue = price === '' || price === null ? null : price !== undefined ? parseInt(price) : undefined;

    const result = await pool.query(
      `UPDATE services SET
        name = COALESCE($1, name),
        price = CASE WHEN $2::boolean THEN $3::integer ELSE price END,
        category = COALESCE($4, category),
        active = COALESCE($5, active)
       WHERE id = $6 RETURNING *`,
      [
        name,
        price !== undefined,   // $2: ¿se envió price?
        priceValue,            // $3: valor (puede ser null)
        category,
        active,
        req.params.id
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Servicio no encontrado.' });
    }
    invalidatePromptCache();
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error actualizando servicio:', err.message);
    res.status(500).json({ success: false, error: 'Error actualizando servicio.' });
  }
});

// DELETE /api/services/:id — solo admin
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM services WHERE id = $1', [req.params.id]);
    invalidatePromptCache();
    res.json({ success: true });
  } catch (err) {
    console.error('Error eliminando servicio:', err.message);
    res.status(500).json({ success: false, error: 'Error eliminando servicio.' });
  }
});

export default router;