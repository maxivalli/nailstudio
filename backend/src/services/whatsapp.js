import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// ─── Configuración Evolution API ────────────────────────────────────────────
const EVOLUTION_API_URL   = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY   = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE  = process.env.EVOLUTION_INSTANCE;
const adminWhatsAppNumber = process.env.ADMIN_WHATSAPP_NUMBER;

let isReady = false;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatPhoneNumber = (phone) => {
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned.startsWith('549')) cleaned = '549' + cleaned;
  return cleaned;
};

const formatDate = (dateStr) => {
  const days   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  let dateOnly;
  if (dateStr instanceof Date) {
    dateOnly = dateStr.toISOString().split('T')[0];
  } else {
    dateOnly = String(dateStr).split('T')[0];
  }

  const date = new Date(dateOnly + 'T12:00:00');
  return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]}`;
};

// ─── Envío de mensajes (formato v1) ──────────────────────────────────────────

const sendTextMessage = async (to, text) => {
  const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`;

  const response = await axios.post(
    url,
    {
      number: to,
      textMessage: {
        text: text
      }
    },
    {
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
};

// ─── Inicialización ───────────────────────────────────────────────────────────

export const initWhatsApp = async () => {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
    console.log('WhatsApp (Evolution API) no configurado — se omiten notificaciones.');
    return null;
  }

  try {
    const { data } = await axios.get(
      `${EVOLUTION_API_URL}/instance/connectionState/${EVOLUTION_INSTANCE}`,
      { headers: { apikey: EVOLUTION_API_KEY } }
    );

    const state = data?.instance?.state;

    if (state === 'open') {
      isReady = true;
      console.log(`✅ Evolution API conectada — instancia: ${EVOLUTION_INSTANCE}`);
    } else {
      console.warn(`⚠️  Instancia "${EVOLUTION_INSTANCE}" en estado: ${state}. Verificá el QR en el panel.`);
    }

    return data;
  } catch (error) {
    console.error('Error conectando con Evolution API:', error.message);
    return null;
  }
};

// ─── Mensajes ─────────────────────────────────────────────────────────────────

export const sendClientConfirmation = async (appointment) => {
  if (!isReady) return { success: false, error: 'Evolution API no configurada o no conectada' };

  const message = `
✨ SY Studio ✨ - Turno Confirmado

¡Hola ${appointment.name}!

💖 Tu turno ha sido confirmado:
📅 Día: ${formatDate(appointment.appointment_date)}
🕐 Hora: ${appointment.appointment_hour}:00 – ${appointment.appointment_hour + 2}:00 hs (2 horas)
📍 Dirección: San Lorenzo 1260

¡Te esperamos! 💅
  `.trim();

  try {
    const result = await sendTextMessage(formatPhoneNumber(appointment.whatsapp), message);
    return { success: true, messageId: result?.key?.id };
  } catch (error) {
    console.error('Error enviando WhatsApp al cliente:', error.message);
    return { success: false, error: error.message };
  }
};

export const sendAdminNotification = async (appointment) => {
  if (!isReady || !adminWhatsAppNumber) {
    return { success: false, error: 'Admin WhatsApp no configurado' };
  }

  const message = `
🔔 *Nuevo Turno Reservado*

👤 Cliente: ${appointment.name}
${appointment.service_name ? `💅🏻 Trabajo: ${appointment.service_name}` : ''}
📱 WhatsApp: ${appointment.whatsapp}
📅 Fecha: ${formatDate(appointment.appointment_date)}
🕐 Hora: ${appointment.appointment_hour}:00 – ${appointment.appointment_hour + 2}:00 hs (2 horas)

ID: #${appointment.id}
  `.trim();

  try {
    const result = await sendTextMessage(formatPhoneNumber(adminWhatsAppNumber), message);
    return { success: true, messageId: result?.key?.id };
  } catch (error) {
    console.error('Error notificando admin por WhatsApp:', error.message);
    return { success: false, error: error.message };
  }
};

export const sendReminder = async (appointment) => {
  if (!isReady) return { success: false, error: 'Evolution API no configurada o no conectada' };

  const message = `
💅 *Recordatorio de Turno*

Hola ${appointment.name}!

Te recordamos tu turno de mañana:
📅 ${formatDate(appointment.appointment_date)}
🕐 ${appointment.appointment_hour}:00 – ${appointment.appointment_hour + 2}:00 hs (2 horas)

Nos vemos! ✨
  `.trim();

  try {
    const result = await sendTextMessage(formatPhoneNumber(appointment.whatsapp), message);
    return { success: true, messageId: result?.key?.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const isWhatsAppReady = () => isReady;

export const getWhatsAppInfo = async () => {
  if (!isReady) return null;
  try {
    const { data } = await axios.get(
      `${EVOLUTION_API_URL}/instance/connectionState/${EVOLUTION_INSTANCE}`,
      { headers: { apikey: EVOLUTION_API_KEY } }
    );
    return { ready: true, provider: 'Evolution API', instance: EVOLUTION_INSTANCE, state: data?.instance?.state };
  } catch {
    return { ready: false, provider: 'Evolution API' };
  }
};

export default {
  initWhatsApp,
  sendClientConfirmation,
  sendAdminNotification,
  sendReminder,
  isWhatsAppReady,
  getWhatsAppInfo,
};