import { pool } from '../db/index.js';
import { broadcast, sseClients } from '../index.js';
import { sendClientConfirmation, sendAdminNotification } from '../services/whatsapp.js';

// Get confirmed appointments for a date range (calendar view)
export const getAppointments = async (req, res) => {
  try {
    const { from, to } = req.query;
    let query = `SELECT id, name, appointment_date, appointment_hour, status FROM appointments WHERE status = 'confirmed'`;
    const params = [];
    if (from && to) {
      params.push(from, to);
      query += ` AND appointment_date BETWEEN $1 AND $2`;
    }
    query += ` ORDER BY appointment_date, appointment_hour`;
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get all appointments (admin)
export const getAllAppointments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM appointments ORDER BY appointment_date, appointment_hour`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get available slots for a specific date
export const getAvailableSlots = async (req, res) => {
  const { date } = req.params;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ success: false, error: 'Formato de fecha inválido' });
  }

  try {
    const d = new Date(date + 'T12:00:00');

    if (isNaN(d.getTime())) {
      return res.status(400).json({ success: false, error: 'Fecha inválida' });
    }

    const dayOfWeek = d.getDay();

    if (dayOfWeek === 0) {
      return res.json({ success: true, data: [], closed: true });
    }

    const takenResult = await pool.query(
      `SELECT appointment_hour FROM appointments WHERE appointment_date = $1 AND status = 'confirmed'`,
      [date]
    );

    const takenHours = takenResult.rows.map(r => r.appointment_hour);

    const now = new Date();
    const argentinaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
    const today = new Date(argentinaTime.getFullYear(), argentinaTime.getMonth(), argentinaTime.getDate());
    const requestDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const isToday = requestDate.getTime() === today.getTime();
    const currentHour = argentinaTime.getHours();

    const allHours = Array.from({ length: 12 }, (_, i) => i + 8);
    const slots = allHours
      .filter(hour => !(isToday && hour <= currentHour))
      .map(hour => ({
        hour,
        label: `${hour.toString().padStart(2, '0')}:00`,
        available: !takenHours.includes(hour),
      }));

    res.json({ success: true, data: slots });
  } catch (err) {
    console.error('Error obteniendo slots:', err.message);
    res.status(500).json({ 
      success: false, 
      error: err.message || 'Error al obtener horarios disponibles'
    });
  }
};

// Create appointment
export const createAppointment = async (req, res) => {
  const { name, whatsapp, appointment_date, appointment_hour } = req.body;

  if (!name || !whatsapp || !appointment_date || appointment_hour === undefined) {
    return res.status(400).json({ success: false, error: 'Todos los campos son requeridos' });
  }

  const d = new Date(appointment_date + 'T12:00:00');
  if (d.getDay() === 0) {
    return res.status(400).json({ success: false, error: 'Los domingos no hay atención' });
  }

  const hour = parseInt(appointment_hour);
  if (hour < 8 || hour >= 20) {
    return res.status(400).json({ success: false, error: 'Horario fuera de rango (8:00 - 19:00)' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO appointments (name, whatsapp, appointment_date, appointment_hour, status)
       VALUES ($1, $2, $3, $4, 'confirmed') RETURNING *`,
      [name, whatsapp, appointment_date, hour]
    );

    const appointment = result.rows[0];

    broadcast('calendar_update', { type: 'new', appointment });

    // Enviar WhatsApp en segundo plano
    setImmediate(async () => {
      try {
        await sendClientConfirmation(appointment);
        await sendAdminNotification(appointment);
      } catch (whatsappError) {
        console.error('Error con WhatsApp:', whatsappError);
      }
    });

    res.status(201).json({ success: true, data: appointment });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'Ese horario ya fue reservado. Elegí otro.' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update status (admin)
export const updateAppointmentStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const valid = ['confirmed', 'cancelled', 'completed'];
  if (!valid.includes(status)) {
    return res.status(400).json({ success: false, error: 'Estado inválido' });
  }
  try {
    const result = await pool.query(
      `UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'No encontrado' });
    broadcast('calendar_update', { type: 'status_change', appointment: result.rows[0] });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete appointment
export const deleteAppointment = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM appointments WHERE id = $1`, [id]);
    broadcast('calendar_update', { type: 'deleted', id: parseInt(id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Stats for admin
export const getStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status='confirmed' AND appointment_date = CURRENT_DATE) AS today_confirmed,
        COUNT(*) FILTER (WHERE status='confirmed' AND appointment_date > CURRENT_DATE) AS upcoming,
        COUNT(*) FILTER (WHERE status='completed') AS total_completed
      FROM appointments
    `);
    const row = result.rows[0];
    res.json({ success: true, data: {
      today_confirmed: parseInt(row.today_confirmed),
      upcoming: parseInt(row.upcoming),
      total_completed: parseInt(row.total_completed),
    }});
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
