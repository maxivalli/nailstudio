import { pool } from '../db/index.js';
import { broadcast } from '../index.js';

export const getGallery = async (req, res) => {
  try {
    const { category } = req.query;
    let query = `SELECT * FROM gallery`;
    const params = [];

    if (category && category !== 'all') {
      query += ` WHERE category = $1`;
      params.push(category);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching gallery:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const addGalleryItem = async (req, res) => {
  const { image_url, title, category } = req.body;

  if (!image_url) {
    return res.status(400).json({ success: false, error: 'URL de imagen requerida' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO gallery (image_url, title, category) VALUES ($1, $2, $3) RETURNING *`,
      [image_url, title || '', category || 'general']
    );

    broadcast('gallery_update', { type: 'new', item: result.rows[0] });
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error agregando imagen a galería:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateGalleryItem = async (req, res) => {
  const { id } = req.params;
  const { title, category } = req.body;

  try {
    const result = await pool.query(
      `UPDATE gallery SET title = $1, category = $2 WHERE id = $3 RETURNING *`,
      [title || '', category || 'general', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Imagen no encontrada' });
    }

    broadcast('gallery_update', { type: 'updated', item: result.rows[0] });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error actualizando imagen de galería:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteGalleryItem = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`DELETE FROM gallery WHERE id = $1 RETURNING id`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Imagen no encontrada' });
    }

    broadcast('gallery_update', { type: 'deleted', id: parseInt(id) });
    res.json({ success: true, message: 'Imagen eliminada' });
  } catch (err) {
    console.error('Error eliminando imagen de galería:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getCategories = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT category FROM gallery WHERE category IS NOT NULL AND category != '' ORDER BY category`
    );
    res.json({ success: true, data: result.rows.map(r => r.category) });
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
