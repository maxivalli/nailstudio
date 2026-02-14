# 🚀 Configuración de Twilio WhatsApp - Paso a Paso

## 📋 Checklist Rápido

- [ ] Crear cuenta en Twilio (5 min)
- [ ] Configurar WhatsApp Sandbox (2 min)
- [ ] Obtener credenciales (1 min)
- [ ] Instalar dependencia (1 min)
- [ ] Copiar archivos al proyecto (2 min)
- [ ] Configurar variables en Render (2 min)
- [ ] Deploy y probar (3 min)

**Total: ~15 minutos** ⏱️

---

## PASO 1: Crear Cuenta en Twilio (5 min)

### 1.1. Registrarse

1. Ir a: **https://www.twilio.com/try-twilio**
2. Click en "Sign up" (arriba a la derecha)
3. Completar:
   - Email
   - Contraseña fuerte
4. Verificar email
5. Completar el cuestionario:
   - "Which Twilio product are you here to use?" → **Messaging**
   - "What do you plan to build?" → **Alerts & Notifications**
   - "How do you want to build with Twilio?" → **With code**
   - "What is your preferred language?" → **Node.js**

### 1.2. Verificar tu número

1. Twilio te pedirá verificar tu número de teléfono
2. Ingresá tu WhatsApp: `+54 9 11 2345-6789` (formato con espacios está bien)
3. Elegí "Text me" (SMS)
4. Ingresá el código que recibís

✅ **Cuenta creada con $15 USD de crédito gratis**

---

## PASO 2: Configurar WhatsApp Sandbox (2 min)

### 2.1. Acceder al Sandbox

1. En el Dashboard de Twilio, buscá en el menú izquierdo:
   - **Messaging** → **Try it out** → **Send a WhatsApp message**
   
2. O ir directo a: **https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn**

### 2.2. Unirte al Sandbox

Vas a ver algo así:

```
To connect your WhatsApp account to the sandbox, 
send this code in a WhatsApp message to +1 415 523 8886:

join <tu-codigo-unico>
```

**Ejemplo:** `join stone-butter`

### 2.3. Unirte desde tu WhatsApp

1. Abrí WhatsApp en tu celular
2. Nuevo mensaje a: `+1 415 523 8886`
3. Enviar: `join stone-butter` (tu código único)
4. Deberías recibir: "You are all set! ✅"

**Importante:** Cada persona que quiera recibir mensajes debe unirse al sandbox.

### 2.4. Configurar el número del admin (vos)

En la misma página del sandbox:

1. Scroll down a "Sandbox Participants"
2. Vas a ver tu número listado
3. **Este número puede recibir mensajes ahora** ✅

---

## PASO 3: Obtener Credenciales (1 min)

### 3.1. Account SID y Auth Token

1. En el Dashboard principal de Twilio
2. Vas a ver un panel "Account Info":
   ```
   ACCOUNT SID
   ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   [Copy]
   
   AUTH TOKEN
   ********************************
   [Show] [Copy]
   ```

3. **Copiar ambos valores** (los vas a necesitar)

### 3.2. Número de WhatsApp del Sandbox

El número del sandbox de Twilio es siempre:
```
whatsapp:+14155238886
```

---

## PASO 4: Instalar Twilio en tu Proyecto (1 min)

```bash
cd backend
npm install twilio
```

---

## PASO 5: Copiar Archivos al Proyecto (2 min)

### 5.1. Copiar el servicio de Twilio

```bash
# Copiar el servicio
cp whatsapp-twilio.js backend/src/services/
```

### 5.2. Actualizar index.js

En `backend/src/index.js`:

```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDB } from './db/index.js';
import appointmentsRouter from './routes/appointments.js';
import galleryRouter from './routes/gallery.js';
import authRouter from './routes/auth.js';
import { initWhatsApp } from './services/whatsapp-twilio.js'; // ← AGREGAR

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ... código existente ...

const start = async () => {
  await initDB();
  
  // Inicializar Twilio WhatsApp
  initWhatsApp(); // ← AGREGAR
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📝 Admin credentials - User: ${process.env.ADMIN_USERNAME || 'admin'}`);
  });
};

start();
```

### 5.3. Actualizar appointments controller

En `backend/src/controllers/appointments.js`:

```javascript
import { pool } from '../db/index.js';
import { broadcast } from '../index.js';
import { sendClientConfirmation, sendAdminNotification } from '../services/whatsapp-twilio.js'; // ← CAMBIAR

// ... resto del código igual ...

// En la función createAppointment, después de crear el turno:
export const createAppointment = async (req, res) => {
  // ... validaciones ...

  try {
    const result = await pool.query(
      `INSERT INTO appointments (name, whatsapp, appointment_date, appointment_hour, status)
       VALUES ($1, $2, $3, $4, 'confirmed') RETURNING *`,
      [name, whatsapp, appointment_date, hour]
    );

    const appointment = result.rows[0];
    broadcast('calendar_update', { type: 'new', appointment });

    // ========================================
    // ENVIAR WHATSAPP CON TWILIO
    // ========================================
    setImmediate(async () => {
      try {
        // Enviar confirmación al cliente
        const clientResult = await sendClientConfirmation(appointment);
        if (clientResult.success) {
          console.log('✅ WhatsApp enviado al cliente:', appointment.name);
        } else {
          console.log('⚠️  Error enviando WhatsApp al cliente:', clientResult.error);
        }

        // Notificar al admin
        const adminResult = await sendAdminNotification(appointment);
        if (adminResult.success) {
          console.log('✅ Admin notificado del nuevo turno');
        } else {
          console.log('⚠️  Error notificando admin:', adminResult.error);
        }
      } catch (whatsappError) {
        console.error('❌ Error con WhatsApp:', whatsappError);
        // No fallar la reserva si falla el WhatsApp
      }
    });

    console.log('📝 Turno creado:', {
      id: appointment.id,
      cliente: appointment.name,
      fecha: appointment.appointment_date,
      hora: appointment.appointment_hour
    });

    res.status(201).json({ 
      success: true, 
      data: appointment
    });

  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'Ese horario ya fue reservado. Elegí otro.' });
    }
    console.error('❌ Error creando turno:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
```

---

## PASO 6: Configurar Variables de Entorno (2 min)

### 6.1. Localmente (.env)

Crear/editar `backend/.env`:

```bash
# Twilio WhatsApp
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=tu_auth_token_aqui
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
ADMIN_WHATSAPP_NUMBER=whatsapp:+5491123456789

# Resto de variables existentes
PORT=3001
DB_HOST=localhost
# ... etc
```

**⚠️ Importante:** El formato del ADMIN_WHATSAPP_NUMBER es:
```
whatsapp:+[código_país][número]
Ejemplo: whatsapp:+5491123456789
```

### 6.2. En Render (Producción)

1. Ir a tu servicio en Render
2. **Environment** (en el menú izquierdo)
3. Click en **Add Environment Variable**
4. Agregar una por una:

```
TWILIO_ACCOUNT_SID = ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN = tu_auth_token_aqui
TWILIO_WHATSAPP_NUMBER = whatsapp:+14155238886
ADMIN_WHATSAPP_NUMBER = whatsapp:+5491123456789
```

5. Click en **Save Changes**

---

## PASO 7: Deploy y Probar (3 min)

### 7.1. Commit y Deploy

```bash
# Desde la carpeta raíz del proyecto
git add .
git commit -m "Add Twilio WhatsApp integration"
git push

# Render se redeploya automáticamente
```

### 7.2. Ver logs en Render

1. En Render Dashboard → Tu servicio → **Logs**
2. Deberías ver:
   ```
   ✅ Twilio WhatsApp configurado correctamente
   🚀 Server running on http://localhost:3001
   ```

### 7.3. Probar en Desarrollo (Local)

```bash
cd backend
npm start

# Deberías ver:
# ✅ Twilio WhatsApp configurado correctamente
```

Reservar un turno de prueba y verificar:
- ✅ El cliente recibe WhatsApp
- ✅ Vos recibís notificación

### 7.4. Probar en Producción

1. Ir a tu sitio en producción
2. Reservar un turno de prueba
3. **Importante:** El número del cliente debe estar unido al sandbox
4. Verificar que llegan los WhatsApp

---

## 🎯 Formato de Números - MUY IMPORTANTE

### ✅ Correcto:

```bash
# Admin (vos)
ADMIN_WHATSAPP_NUMBER=whatsapp:+5491123456789

# Cliente en la DB (solo el número, sin "whatsapp:")
whatsapp: "1123456789"  # El código de país se agrega automáticamente
# o
whatsapp: "5491123456789"  # Con código de país
```

### ❌ Incorrecto:

```bash
# Sin el prefijo "whatsapp:"
ADMIN_WHATSAPP_NUMBER=+5491123456789

# Con espacios o guiones
ADMIN_WHATSAPP_NUMBER=whatsapp:+54 9 11 2345-6789

# Sin código de país
ADMIN_WHATSAPP_NUMBER=whatsapp:+1123456789
```

---

## 📱 Sandbox vs Número Real

### Sandbox (Gratis para testing):

✅ Pros:
- Gratis
- Funciona inmediatamente
- Perfecto para desarrollo/testing

❌ Contras:
- Cada cliente debe unirse con `join code`
- Muestra "Twilio Sandbox" en mensajes
- No es profesional para producción real

### Número Real (Para producción):

Cuando estés listo para producción:

1. Ir a **Messaging** → **Services**
2. Crear un servicio de WhatsApp Business
3. Registrar tu número de negocio
4. Costo: ~$0.005 USD por mensaje
5. Cambiar `TWILIO_WHATSAPP_NUMBER` por tu número real

---

## 💰 Costos Estimados

### Con Sandbox (Testing):
- **$0/mes** - Gratis con los $15 de crédito

### Producción (Número real):
- **~$0.005 USD por mensaje**
- Ejemplo: 100 turnos/mes = 200 mensajes = **$1 USD/mes**
- Tu crédito de $15 = **3,000 mensajes** = ~1,500 turnos

---

## 🐛 Troubleshooting

### Error: "Unable to create record: Permission denied"

**Causa:** El número del cliente no está unido al sandbox

**Solución:**
1. El cliente debe enviar `join [codigo]` a `+1 415 523 8886`
2. O vos podés agregar el número manualmente en el Dashboard de Twilio

### Error: "Authenticate"

**Causa:** ACCOUNT_SID o AUTH_TOKEN incorrectos

**Solución:**
1. Verificar que copiaste bien las credenciales
2. No debe haber espacios al principio/final
3. Revisar en Render que las variables estén bien

### Error: "Invalid 'To' Phone Number"

**Causa:** Formato del número incorrecto

**Solución:**
```javascript
// El código ya maneja esto, pero verificá:
// En whatsapp-twilio.js, la función formatPhoneNumber
// debe agregar el código de país 54 si no lo tiene
```

### No llegan los mensajes

**Checklist:**
- [ ] El cliente está unido al sandbox (envió `join code`)
- [ ] El ADMIN_WHATSAPP_NUMBER tiene formato: `whatsapp:+54...`
- [ ] Las credenciales son correctas
- [ ] El backend está corriendo sin errores
- [ ] Revisar logs de Twilio: https://console.twilio.com/us1/monitor/logs/debugger

---

## 🎉 ¡Listo para Producción!

Una vez configurado, tu sistema:

✅ Envía WhatsApp automático al cliente confirmando turno
✅ Te notifica a vos de cada turno nuevo
✅ Funciona en Render sin problemas
✅ Costo super bajo (~$1-3/mes)
✅ Profesional y confiable

---

## 📞 Próximos Pasos

1. **Ahora:** Probar en desarrollo con sandbox
2. **Cuando funcione bien:** Seguir usando sandbox (es gratis)
3. **Cuando tengas clientes reales:** Upgrade a número real de WhatsApp Business
4. **Opcional:** Agregar recordatorios 24hs antes (con node-cron)

---

## 🔗 Links Útiles

- **Twilio Console:** https://console.twilio.com
- **WhatsApp Sandbox:** https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
- **Logs de mensajes:** https://console.twilio.com/us1/monitor/logs/debugger
- **Billing:** https://console.twilio.com/us1/billing

---

¿Todo claro? ¡Arrancamos con la configuración! 🚀
