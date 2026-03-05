import { pool } from '../db/index.js';
import { broadcast, broadcastPublic } from '../index.js';
import { sendClientConfirmation, sendAdminNotification } from '../services/whatsapp.js';

// Get confirmed appointments for a date range (calendar view)
export const getAppointments = async (req, res) => {
  try {
    const { from, to } = req.query;
    // SEGURIDAD: la ruta pública solo expone fecha/hora para mostrar disponibilidad,
    // no el nombre del cliente.
    let query = `SELECT id, appointment_date, appointment_hour, status FROM appointments WHERE status = 'confirmed'`;
    const params = [];
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (from && to) {
      if (!dateRegex.test(from) || !dateRegex.test(to)) {
        return res.status(400).json({ success: false, error: 'Formato de fecha inválido.' });
      }
      params.push(from, to);
      query += ` AND appointment_date BETWEEN $1 AND $2`;
    }
    query += ` ORDER BY appointment_date, appointment_hour`;
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getAppointments:', err.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor.' });
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
  const { name, whatsapp, appointment_date, appointment_hour, service_name, service_price, design_note, design_image_url } = req.body;

  if (!name || !whatsapp || !appointment_date || appointment_hour === undefined) {
    return res.status(400).json({ success: false, error: 'Todos los campos son requeridos' });
  }

  // Sanitizar y validar name
  const cleanName = String(name).trim().slice(0, 100);
  if (cleanName.length < 2) {
    return res.status(400).json({ success: false, error: 'El nombre debe tener al menos 2 caracteres' });
  }

  // Normalizar y validar whatsapp: exactamente 10 dígitos sin prefijos
  let cleanWhatsapp = String(whatsapp).replace(/\D/g, '');
  cleanWhatsapp = cleanWhatsapp.replace(/^(0549|549|054|54|0)/, '');
  cleanWhatsapp = cleanWhatsapp.slice(0, 10);
  if (cleanWhatsapp.length !== 10) {
    return res.status(400).json({ success: false, error: 'El número debe tener exactamente 10 dígitos, ej: 3408123456' });
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

  const hour = parseInt(appointment_hour);
  const validHours = [8, 10, 12, 14, 16, 18];
  if (!validHours.includes(hour)) {
    return res.status(400).json({ success: false, error: 'Horario inválido. Los turnos son de 2 horas: 8:00, 10:00, 12:00, 14:00, 16:00 o 18:00' });
  }

  // Validar que la fecha no sea en el pasado, y si es hoy que la hora no haya pasado ya
  const argentinaTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  const todayArg = new Date(argentinaTime.getFullYear(), argentinaTime.getMonth(), argentinaTime.getDate());
  const requestedDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (requestedDay < todayArg) {
    return res.status(400).json({ success: false, error: 'No podés reservar en una fecha pasada.' });
  }
  if (requestedDay.getTime() === todayArg.getTime() && hour <= argentinaTime.getHours()) {
    return res.status(400).json({ success: false, error: 'Ese horario ya pasó. Elegí otro turno.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO appointments (name, whatsapp, appointment_date, appointment_hour, status, service_name, service_price, design_note, design_image_url)
       VALUES ($1, $2, $3, $4, 'confirmed', $5, $6, $7, $8) RETURNING *`,
      [cleanName, cleanWhatsapp, appointment_date, hour, service_name || null, service_price ? parseInt(service_price) : null, design_note || null, design_image_url || null]
    );

    const appointment = result.rows[0];

    const { whatsapp: _w, ...publicAppt } = appointment;
    broadcast('calendar_update', { type: 'new', appointment: publicAppt });
    broadcastPublic('calendar_update'); // notifica al calendario público sin datos personales

    // Enviar WhatsApp en segundo plano
    setImmediate(async () => {
      try {
        await sendClientConfirmation(appointment);
        await sendAdminNotification(appointment);
      } catch (whatsappError) {
        console.error('Error con WhatsApp:', whatsappError);
      }
    });

    // SEGURIDAD: nunca devolver whatsapp al cliente en la respuesta HTTP
    res.status(201).json({ success: true, data: publicAppt });
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
    const { whatsapp: _w2, ...publicAppt2 } = result.rows[0];
    broadcast('calendar_update', { type: 'status_change', appointment: publicAppt2 });
    broadcastPublic('calendar_update');
    // SEGURIDAD: usar publicAppt2 (sin whatsapp) en la respuesta
    res.json({ success: true, data: publicAppt2 });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete appointment
export const deleteAppointment = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM appointments WHERE id = $1`, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Turno no encontrado.' });
    }
    broadcast('calendar_update', { type: 'deleted', id: parseInt(id) });
    broadcastPublic('calendar_update');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error interno del servidor.' });
  }
};

// Stats for admin
export const getStats = async (req, res) => {
  try {
    const todayArg = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
    }); // formato YYYY-MM-DD en hora Argentina
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status='confirmed' AND appointment_date = $1::date) AS today_confirmed,
        COUNT(*) FILTER (WHERE status='confirmed' AND appointment_date > $1::date) AS upcoming,
        COUNT(*) FILTER (WHERE status='completed') AS total_completed
      FROM appointments
    `, [todayArg]);
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
// ── Estadísticas avanzadas ────────────────────────────────────────────────────

export const getServiceStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        service_name,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled
      FROM appointments
      WHERE service_name IS NOT NULL
      GROUP BY service_name
      ORDER BY total DESC
      LIMIT 10
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getServiceStats:', err.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor.' });
  }
};

export const getFrequentClients = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        name,
        whatsapp,
        COUNT(*) AS total_appointments,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        MAX(appointment_date) AS last_visit,
        MIN(appointment_date) AS first_visit
      FROM appointments
      WHERE status != 'cancelled'
      GROUP BY name, whatsapp
      ORDER BY total_appointments DESC
      LIMIT 10
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getFrequentClients:', err.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor.' });
  }
};

export const getClientHistory = async (req, res) => {
  const { whatsapp } = req.params;
  if (!whatsapp || whatsapp.replace(/\D/g, '').length < 8) {
    return res.status(400).json({ success: false, error: 'Número inválido.' });
  }
  const cleaned = whatsapp.replace(/\D/g, '');
  try {
    const result = await pool.query(`
      SELECT
        id, name, whatsapp, appointment_date, appointment_hour,
        service_name, service_price, status, created_at
      FROM appointments
      WHERE whatsapp LIKE $1
      ORDER BY appointment_date DESC, appointment_hour DESC
    `, ['%' + cleaned.slice(-8)]);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error en getClientHistory:', err.message);
    res.status(500).json({ success: false, error: 'Error interno del servidor.' });
  }
};