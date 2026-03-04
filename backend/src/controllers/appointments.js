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

    const allHours = [8, 10, 12, 14, 16, 18]; // Turnos de 2 horas: 8-10, 10-12, 12-14, 14-16, 16-18, 18-20
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
  const { name, whatsapp, appointment_date, appointment_hour, service_name, service_price } = req.body;

  if (!name || !whatsapp || !appointment_date || appointment_hour === undefined) {
    return res.status(400).json({ success: false, error: 'Todos los campos son requeridos' });
  }

  // Sanitizar y validar name
  const cleanName = String(name).trim().slice(0, 100);
  if (cleanName.length < 2) {
    return res.status(400).json({ success: false, error: 'El nombre debe tener al menos 2 caracteres' });
  }

  // Sanitizar y validar whatsapp (solo dígitos, entre 8 y 20 caracteres)
  const cleanWhatsapp = String(whatsapp).replace(/\D/g, '').slice(0, 20);
  if (cleanWhatsapp.length < 8) {
    return res.status(400).json({ success: false, error: 'El número de WhatsApp debe tener al menos 8 dígitos' });
  }

  // Validar formato de fecha
  if (!/^\d{4}-\d{2}-\d{2}$/.test(appointment_date)) {
    return res.status(400).json({ success: false, error: 'Formato de fecha inválido' });
  }

  const d = new Date(appointment_date + 'T12:00:00');
  if (isNaN(d.getTime())) {
    return res.status(400).json({ success: false, error: 'Fecha inválida' });
  }
  if (d.getDay() === 0) {
    return res.status(400).json({ success: false, error: 'Los domingos no hay atención' });
  }

  // Validar que la fecha no sea pasada
  const now = new Date();
  const argentina = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  const todayArg = new Date(argentina.getFullYear(), argentina.getMonth(), argentina.getDate());
  const appointmentDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (appointmentDay < todayArg) {
    return res.status(400).json({ success: false, error: 'No podés reservar turnos en fechas pasadas.' });
  }

  const hour = parseInt(appointment_hour);
  const validHours = [8, 10, 12, 14, 16, 18];
  if (!validHours.includes(hour)) {
    return res.status(400).json({ success: false, error: 'Horario inválido. Los turnos son de 2 horas: 8:00, 10:00, 12:00, 14:00, 16:00 o 18:00' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO appointments (name, whatsapp, appointment_date, appointment_hour, status, service_name, service_price)
       VALUES ($1, $2, $3, $4, 'confirmed', $5, $6) RETURNING *`,
      [cleanName, cleanWhatsapp, appointment_date, hour, service_name || null, service_price ? parseInt(service_price) : null]
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