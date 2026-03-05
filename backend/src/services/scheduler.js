import cron from 'node-cron';
import { pool } from '../db/index.js';
import { sendReminder, isWhatsAppReady } from './whatsapp.js';

// Corre todos los días a las 9:00 hora Argentina
const CRON_EXPRESSION = '0 8 * * *';

const sendDailyReminders = async () => {
  if (!isWhatsAppReady()) {
    console.log('[Scheduler] WhatsApp no está listo, se omiten recordatorios.');
    return;
  }

  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });

  console.log(`[Scheduler] Buscando turnos para hoy: ${today}`);

  try {
    // Solo trae turnos que NO tengan reminder_sent = true — previene duplicados
    const result = await pool.query(
      `SELECT * FROM appointments
       WHERE appointment_date = $1
         AND status = 'confirmed'
         AND reminder_sent = false
       ORDER BY appointment_hour ASC`,
      [today]
    );

    const appointments = result.rows;

    if (appointments.length === 0) {
      console.log('[Scheduler] No hay turnos pendientes de recordatorio.');
      return;
    }

    console.log(`[Scheduler] Enviando ${appointments.length} recordatorio(s)...`);

    for (const appt of appointments) {
      const result = await sendReminder(appt);

      if (result.success) {
        // Marcar como enviado inmediatamente — si el server cae después, no se reenvía
        await pool.query(
          `UPDATE appointments SET reminder_sent = true WHERE id = $1`,
          [appt.id]
        );
        console.log(`[Scheduler] ✅ Recordatorio enviado a ${appt.name}`);
      } else {
        console.error(`[Scheduler] ❌ Error enviando a ${appt.name}: ${result.error}`);
      }

      await new Promise(r => setTimeout(r, 1000));
    }

    console.log('[Scheduler] Recordatorios completados.');
  } catch (err) {
    console.error('[Scheduler] Error al procesar recordatorios:', err.message);
  }
};

export const initScheduler = () => {
  cron.schedule(CRON_EXPRESSION, sendDailyReminders, {
    timezone: 'America/Argentina/Buenos_Aires',
  });

  console.log('📅 Scheduler activo — recordatorios a las 9:00 (hora Argentina)');
};

export default { initScheduler };