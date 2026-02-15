// src/services/whatsapp-twilio.js
// Servicio de WhatsApp usando Twilio para PRODUCCIÓN

import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER; // whatsapp:+14155238886
const adminWhatsAppNumber = process.env.ADMIN_WHATSAPP_NUMBER; // whatsapp:+5491123456789

let client = null;
let isReady = false;

// Inicializar cliente de Twilio
export const initWhatsApp = () => {
  if (!accountSid || !authToken || !twilioWhatsAppNumber) {
    console.log('⚠️  Twilio no configurado completamente');
    console.log('   Configurá las variables de entorno en Render:');
    console.log('   - TWILIO_ACCOUNT_SID');
    console.log('   - TWILIO_AUTH_TOKEN');
    console.log('   - TWILIO_WHATSAPP_NUMBER');
    console.log('   - ADMIN_WHATSAPP_NUMBER');
    return null;
  }

  try {
    client = twilio(accountSid, authToken);
    isReady = true;
    console.log('✅ Twilio WhatsApp configurado correctamente');
    return client;
  } catch (error) {
    console.error('❌ Error inicializando Twilio:', error.message);
    return null;
  }
};

const formatDate = (dateStr) => {
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  // PostgreSQL puede devolver un objeto Date o un string — normalizamos
  let dateOnly;
  if (dateStr instanceof Date) {
    dateOnly = dateStr.toISOString().split("T")[0];
  } else {
    dateOnly = String(dateStr).split("T")[0];
  }

  const date = new Date(dateOnly + "T12:00:00");
  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];

  return `${dayName} ${day} de ${month}`;
};

// Formatear número para Twilio
const formatPhoneNumber = (phone) => {
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned.startsWith('549')) cleaned = '549' + cleaned;
  return `whatsapp:+${cleaned}`;
};

export const sendClientConfirmation = async (appointment) => {
  if (!isReady || !client) {
    console.log('⚠️  Twilio no está listo');
    return { success: false, error: 'Twilio no configurado' };
  }

  try {
    const message = `
🎨 *SY Studio* - Turno Confirmado

¡Hola ${appointment.name}! 

Tu turno ha sido confirmado:
📅 Día: ${formatDate(appointment.appointment_date)}
🕐 Hora: ${appointment.appointment_hour}:00 hs

Te esperamos! 💅

Si necesitás cancelar o reprogramar, avisanos por este número.
    `.trim();

    const result = await client.messages.create({
      from: twilioWhatsAppNumber,
      to: formatPhoneNumber(appointment.whatsapp),
      body: message
    });

    console.log('✅ WhatsApp enviado al cliente (Twilio):', result.sid);
    return { success: true, messageId: result.sid };
  } catch (error) {
    console.error('❌ Error enviando WhatsApp:', error.message);
    return { success: false, error: error.message };
  }
};

export const sendAdminNotification = async (appointment) => {
  if (!isReady || !client || !adminWhatsAppNumber) {
    return { success: false, error: 'Admin WhatsApp no configurado' };
  }

  try {
    const message = `
🔔 *Nuevo Turno Reservado*

👤 Cliente: ${appointment.name}
📱 WhatsApp: ${appointment.whatsapp}
📅 Fecha: ${formatDate(appointment.appointment_date)}
🕐 Hora: ${appointment.appointment_hour}:00 hs

ID: #${appointment.id}
    `.trim();

    const result = await client.messages.create({
      from: twilioWhatsAppNumber,
      to: adminWhatsAppNumber,
      body: message
    });

    console.log('✅ Notificación enviada al admin (Twilio):', result.sid);
    return { success: true, messageId: result.sid };
  } catch (error) {
    console.error('❌ Error notificando admin:', error.message);
    return { success: false, error: error.message };
  }
};

export const sendReminder = async (appointment) => {
  if (!isReady || !client) {
    return { success: false, error: 'Twilio no configurado' };
  }

  try {
    const message = `
💅 *Recordatorio de Turno*

Hola ${appointment.name}!

Te recordamos tu turno de mañana:
📅 ${formatDate(appointment.appointment_date)}
🕐 ${appointment.appointment_hour}:00 hs

Nos vemos! ✨
    `.trim();

    const result = await client.messages.create({
      from: twilioWhatsAppNumber,
      to: formatPhoneNumber(appointment.whatsapp),
      body: message
    });

    return { success: true, messageId: result.sid };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const isWhatsAppReady = () => isReady;

export const getWhatsAppInfo = async () => {
  if (!isReady) return null;
  return {
    ready: true,
    provider: 'Twilio',
    number: twilioWhatsAppNumber
  };
};

export default {
  initWhatsApp,
  sendClientConfirmation,
  sendAdminNotification,
  sendReminder,
  isWhatsAppReady,
  getWhatsAppInfo
};