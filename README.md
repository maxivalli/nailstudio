# 💅 Nail Studio - Sistema Completo con WhatsApp

Sistema de gestión para salón de uñas con reserva de turnos, galería y notificaciones automáticas por WhatsApp (Twilio).

## ✨ Características

- 📅 Reserva de turnos online con calendario interactivo
- 🖼️ Galería de trabajos gestionable desde admin
- 🔐 Panel de administración con login seguro (JWT)
- 📱 **WhatsApp automático con Twilio** - Cliente y admin reciben notificaciones
- 🔄 Actualizaciones en tiempo real (SSE)

## 🚀 Instalación Rápida

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Editar .env con tus credenciales
npm start
```

### 2. Frontend

```bash
cd frontend
npm install  
npm run dev
```

### 3. Base de Datos

```bash
createdb nail_salon
# Las tablas se crean automáticamente al iniciar el backend
```

### 4. Configurar Twilio WhatsApp

**Guía completa:** Ver `TWILIO-SETUP-COMPLETO.md`

**Quick Start (5 min):**
1. Crear cuenta: https://www.twilio.com/try-twilio
2. Ir a WhatsApp Sandbox
3. Enviar `join [codigo]` al +1 415 523 8886
4. Copiar credenciales al `.env`:

```bash
TWILIO_ACCOUNT_SID=ACxxx...
TWILIO_AUTH_TOKEN=xxx...
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
ADMIN_WHATSAPP_NUMBER=whatsapp:+5491123456789
```

## 🔑 Credenciales Admin

- Usuario: `admin`
- Contraseña: `admin123`

⚠️ Cambiar en producción editando `.env`

## 📱 Cómo Funciona WhatsApp

Cuando un cliente reserva un turno:

✅ **Cliente recibe automáticamente:**
```
🎨 Nail Studio - Turno Confirmado
¡Hola Juan!
Tu turno: Lunes 17 Feb - 14:00 hs
Te esperamos! 💅
```

✅ **Vos recibís automáticamente:**
```
🔔 Nuevo Turno
Cliente: Juan Pérez  
WhatsApp: 1123456789
Fecha: Lunes 17 Feb - 14:00 hs
```

## 💰 Costos

- **Desarrollo:** GRATIS (Twilio $15 crédito)
- **Producción:** ~$1-3/mes (~100 turnos)

## 📚 Documentación

- `TWILIO-SETUP-COMPLETO.md` - Guía paso a paso Twilio
- `.env.example` - Variables de entorno
- Troubleshooting en la guía de Twilio

## 🚢 Deploy en Render

1. Crear servicio web
2. Configurar variables de entorno
3. Deploy automático

## 🛠️ Stack Tecnológico

- **Backend:** Node.js + Express + PostgreSQL
- **Frontend:** React + Vite
- **Auth:** JWT
- **WhatsApp:** Twilio API
- **Real-time:** Server-Sent Events

---

Hecho con 💅 para salones de uñas
