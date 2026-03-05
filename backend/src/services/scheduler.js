import cron from 'node-cron';
import { pool } from '../db/index.js';
import { sendReminder, isWhatsAppReady } from './whatsapp.js';

// 7:00 — solo turno de las 8:00
const CRON_EARLY = '0 7 * * *';
// 9:00 — resto de los turnos (10:00 en adelante)
const CRON_MAIN  = '0 9 * * *';

const sendReminders = async (onlyHour = null) => {
  if (!isWhatsAppReady()) {
    console.log('[Scheduler] WhatsApp no está listo, se omiten recordatorios.');
    return;
  }

  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });

  console.log(`[Scheduler] Buscando turnos para hoy: ${today}${onlyHour !== null ? ` (solo hora ${onlyHour}:00)` : ' (hora 10:00 en adelante)'}`);

  try {
    // reminder_sent = false previene duplicados si el cron corre dos veces
    const result = await pool.query(
      `SELECT * FROM appointments
       WHERE appointment_date = $1
         AND status = 'confirmed'
         AND reminder_sent = false
         AND (
               ($2::int IS NULL     AND appointment_hour > 8)
               OR
               ($2::int IS NOT NULL AND appointment_hour = $2)
             )
       ORDER BY appointment_hour ASC`,
      [today, onlyHour]
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
  // 7:00 — solo avisa a la clienta del turno de las 8:00
  cron.schedule(CRON_EARLY, () => sendReminders(8), {
    timezone: 'America/Argentina/Buenos_Aires',
  });

  // 9:00 — avisa al resto (turnos de 10:00 en adelante)
  cron.schedule(CRON_MAIN, () => sendReminders(null), {
    timezone: 'America/Argentina/Buenos_Aires',
  });

  console.log('📅 Scheduler activo — 7:00 (turno 8:00) y 9:00 (resto) hora Argentina');
};

export default { initScheduler };