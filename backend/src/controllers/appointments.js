import { pool } from '../db/index.js';
import { broadcast } from '../index.js';
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
  console.log('📅 [getAvailableSlots] Request recibido para fecha:', date);
  
  // Validate date format
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error('❌ [getAvailableSlots] Formato de fecha inválido:', date);
    return res.status(400).json({ success: false, error: 'Formato de fecha inválido' });
  }

  try {
    const d = new Date(date + 'T12:00:00');
    console.log('📆 [getAvailableSlots] Fecha parseada:', d);
    
    // Check if date is valid
    if (isNaN(d.getTime())) {
      console.error('❌ [getAvailableSlots] Fecha inválida después de parsear:', date);
      return res.status(400).json({ success: false, error: 'Fecha inválida' });
    }

    const dayOfWeek = d.getDay();
    console.log('📍 [getAvailableSlots] Día de la semana:', dayOfWeek);
    
    if (dayOfWeek === 0) {
      console.log('🚫 [getAvailableSlots] Domingo - local cerrado');
      return res.json({ success: true, data: [], closed: true });
    }

    console.log('🔍 [getAvailableSlots] Consultando DB...');
    const takenResult = await pool.query(
      `SELECT appointment_hour FROM appointments WHERE appointment_date = $1 AND status = 'confirmed'`,
      [date]
    );
    console.log('✅ [getAvailableSlots] Query exitosa. Turnos ocupados:', takenResult.rows.length);
    
    const takenHours = takenResult.rows.map(r => r.appointment_hour);
    console.log('⏰ [getAvailableSlots] Horas ocupadas:', takenHours);
    
    // Get current date and hour in local timezone
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const requestDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const isToday = requestDate.getTime() === today.getTime();
    const currentHour = now.getHours();
    
    console.log('🕐 [getAvailableSlots] Hora actual:', currentHour, '- Es hoy:', isToday);
    
    const allHours = Array.from({ length: 12 }, (_, i) => i + 8);
    const slots = allHours
      .filter(hour => {
        // Si es hoy, excluir horas que ya pasaron o la hora actual
        if (isToday && hour <= currentHour) {
          return false;
        }
        return true;
      })
      .map(hour => ({
        hour,
        label: `${hour.toString().padStart(2, '0')}:00`,
        available: !takenHours.includes(hour),
      }));

    console.log('✨ [getAvailableSlots] Slots generados:', slots.length);
    res.json({ success: true, data: slots });
  } catch (err) {
    console.error('💥 [getAvailableSlots] ERROR:', {
      message: err.message,
      stack: err.stack,
      code: err.code,
      detail: err.detail
    });
    res.status(500).json({ 
      success: false, 
      error: err.message || 'Error al obtener horarios disponibles',
      detail: process.env.NODE_ENV === 'development' ? err.stack : undefined
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

    // Enviar WhatsApp con Twilio (en segundo plano)
    setImmediate(async () => {
      try {
        // Confirmación al cliente
        const clientResult = await sendClientConfirmation(appointment);
        if (clientResult.success) {
          console.log('✅ WhatsApp enviado al cliente:', appointment.name);
        } else {
          console.log('⚠️  Error enviando WhatsApp al cliente:', clientResult.error);
        }

        // Notificación al admin
        const adminResult = await sendAdminNotification(appointment);
        if (adminResult.success) {
          console.log('✅ Admin notificado del nuevo turno');
        } else {
          console.log('⚠️  Error notificando admin:', adminResult.error);
        }
      } catch (whatsappError) {
        console.error('❌ Error con WhatsApp:', whatsappError);
      }
    });

    console.log('📝 Turno creado:', {
      id: appointment.id,
      cliente: appointment.name,
      fecha: appointment.appointment_date,
      hora: appointment.appointment_hour
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
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
