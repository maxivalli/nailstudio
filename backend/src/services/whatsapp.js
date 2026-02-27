import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// ─── Configuración Evolution API ────────────────────────────────────────────
const EVOLUTION_API_URL     = process.env.EVOLUTION_API_URL;      // ej: http://localhost:8080
const EVOLUTION_API_KEY     = process.env.EVOLUTION_API_KEY;      // API Key global o de instancia
const EVOLUTION_INSTANCE    = process.env.EVOLUTION_INSTANCE;     // nombre de tu instancia
const adminWhatsAppNumber   = process.env.ADMIN_WHATSAPP_NUMBER;  // ej: 5491112345678

let isReady = false;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Normaliza un número al formato que Evolution API espera: solo dígitos con código de país.
 * Ejemplo: "1123456789" → "5491123456789"
 */
const formatPhoneNumber = (phone) => {
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned.startsWith('549')) cleaned = '549' + cleaned;
  return cleaned; // Evolution API recibe solo el número, sin "whatsapp:+" ni "+"
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

/**
 * Envía un mensaje de texto vía Evolution API.
 * Docs: POST /message/sendText/{instance}
 */
const sendTextMessage = async (to, text) => {
  const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`;

  const response = await axios.post(
    url,
    {
      number: to,
      text,
      // Opcionales:
      // delay: 1200,          // retraso en ms antes de enviar (simula typing)
      // linkPreview: false,
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

/**
 * Verifica que las variables de entorno están presentes y que la instancia
 * de Evolution API está conectada antes de habilitar el envío de mensajes.
 */
export const initWhatsApp = async () => {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
    console.log('WhatsApp (Evolution API) no configurado — se omiten notificaciones.');
    return null;
  }

  try {
    // Consulta el estado de la instancia
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
🎨 *SY Studio* - Turno Confirmado

¡Hola ${appointment.name}!

Tu turno ha sido confirmado:
📅 Día: ${formatDate(appointment.appointment_date)}
🕐 Hora: ${appointment.appointment_hour}:00 hs

Te esperamos! 💅

Si necesitás cancelar o reprogramar, avisanos por este número.
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
📱 WhatsApp: ${appointment.whatsapp}
📅 Fecha: ${formatDate(appointment.appointment_date)}
🕐 Hora: ${appointment.appointment_hour}:00 hs

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
🕐 ${appointment.appointment_hour}:00 hs

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