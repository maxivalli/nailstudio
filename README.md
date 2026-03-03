# 💅 SY Studio — Sistema de Turnos Online

Aplicación web fullstack para la gestión de turnos de un estudio de nail art. Permite a los clientes reservar turnos online y al equipo administrar la agenda desde un panel privado, con notificaciones automáticas por WhatsApp.

---

## Tecnologías

**Frontend**
- React 18 + React Router v6
- Vite como bundler
- CSS modular por componente
- Nginx (en producción / Docker)

**Backend**
- Node.js 20+ con ES Modules
- Express.js
- PostgreSQL 16 (via `pg`)
- JWT para autenticación del panel admin
- Server-Sent Events (SSE) para actualizaciones en tiempo real

**Notificaciones**
- Evolution API (WhatsApp) para confirmaciones y recordatorios

**Infraestructura**
- Docker + Docker Compose para levantarlo todo con un solo comando
- Compatible con despliegue en Vercel (frontend) y Railway / Render (backend + DB)

---

## Funcionalidades

- Calendario semanal con visualización de disponibilidad por día
- Reserva de turnos de **2 horas** (8:00–10:00, 10:00–12:00, 12:00–14:00, 14:00–16:00, 16:00–18:00, 18:00–20:00)
- Sin turnos los domingos
- Bloqueo automático de horarios pasados (zona horaria Argentina)
- Actualización en tiempo real del calendario vía SSE
- Notificación por WhatsApp al cliente al confirmar turno
- Notificación por WhatsApp al administrador con datos del cliente
- Panel de administración protegido con login (JWT)
- Gestión de estados: confirmado / completado / cancelado
- Galería de trabajos editable desde el panel admin
- Estadísticas básicas: turnos de hoy, próximos y completados

---

## Estructura del proyecto

```
nailstudio/
├── backend/
│   └── src/
│       ├── controllers/       # Lógica de negocio (appointments, auth, gallery)
│       ├── routes/            # Endpoints REST
│       ├── services/          # Integración WhatsApp (Evolution API)
│       ├── db/                # Conexión y schema de PostgreSQL
│       └── index.js           # Entry point + SSE
├── frontend/
│   └── src/
│       ├── components/        # BookingCalendar, AdminPanel, Gallery, etc.
│       ├── pages/             # Home, Landing
│       ├── api.js             # Cliente HTTP hacia el backend
│       └── App.jsx            # Rutas principales
├── docker-compose.yml
└── README.md
```

---

## Variables de entorno

### Backend (`.env` en `/backend`)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor | `3001` |
| `DB_HOST` | Host de PostgreSQL | `localhost` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_NAME` | Nombre de la base de datos | `nail_salon` |
| `DB_USER` | Usuario de PostgreSQL | `postgres` |
| `DB_PASSWORD` | Contraseña de PostgreSQL | `postgres` |
| `DATABASE_URL` | URL completa (alternativa, para Railway/Render) | `postgresql://...` |
| `FRONTEND_URL` | URL del frontend (para CORS) | `http://localhost:5173` |
| `JWT_SECRET` | Clave secreta para tokens JWT | `una-clave-segura` |
| `ADMIN_PASSWORD` | Contraseña del panel admin | `admin123` |
| `EVOLUTION_API_URL` | URL de la instancia Evolution API | `https://api.tudominio.com` |
| `EVOLUTION_API_KEY` | API Key de Evolution | `tu-api-key` |
| `EVOLUTION_INSTANCE` | Nombre de la instancia | `mi-instancia` |
| `ADMIN_WHATSAPP_NUMBER` | Número del admin para notificaciones | `5493408000000` |

---

## Instalación y uso

### Con Docker (recomendado)

```bash
# Clonar el repositorio
git clone <repo-url>
cd nailstudio

# Configurar variables de entorno
cp backend/.env.example backend/.env
# Editar backend/.env con tus valores

# Levantar todo (DB + backend + frontend)
docker compose up --build
```

La app queda disponible en `http://localhost:5173`.

---

### Sin Docker (desarrollo local)

**Requisitos:** Node.js 20+, PostgreSQL 16 corriendo localmente.

```bash
# Backend
cd backend
cp .env.example .env    # completar variables
npm install
npm run dev             # corre en http://localhost:3001

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev             # corre en http://localhost:5173
```

---

## API REST

Base URL: `http://localhost:3001/api`

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| `GET` | `/appointments` | Turnos confirmados (rango de fechas) | No |
| `GET` | `/appointments/slots/:date` | Slots disponibles para una fecha | No |
| `POST` | `/appointments` | Crear nuevo turno | No |
| `GET` | `/appointments/all` | Todos los turnos | ✅ Admin |
| `GET` | `/appointments/stats` | Estadísticas | ✅ Admin |
| `PATCH` | `/appointments/:id/status` | Cambiar estado | ✅ Admin |
| `DELETE` | `/appointments/:id` | Eliminar turno | ✅ Admin |
| `POST` | `/auth/login` | Login del administrador | No |
| `GET` | `/gallery` | Imágenes de la galería | No |
| `POST` | `/gallery` | Agregar imagen | ✅ Admin |
| `DELETE` | `/gallery/:id` | Eliminar imagen | ✅ Admin |

---

## Base de datos

### Tabla `appointments`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | SERIAL PK | ID autoincremental |
| `name` | VARCHAR(100) | Nombre del cliente |
| `whatsapp` | VARCHAR(20) | Número de WhatsApp |
| `appointment_date` | DATE | Fecha del turno |
| `appointment_hour` | SMALLINT | Hora de inicio (8, 10, 12, 14, 16 o 18) |
| `status` | VARCHAR(20) | `confirmed`, `cancelled` o `completed` |
| `created_at` | TIMESTAMP | Fecha de creación |

Restricción única: `(appointment_date, appointment_hour)` — no pueden existir dos turnos en el mismo horario.

### Tabla `gallery`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | SERIAL PK | ID autoincremental |
| `image_url` | TEXT | URL de la imagen |
| `title` | VARCHAR(100) | Título opcional |
| `category` | VARCHAR(50) | Categoría (default: `general`) |
| `created_at` | TIMESTAMP | Fecha de carga |

---

## Despliegue en producción

**Frontend → Vercel**

```bash
cd frontend
# Configurar VITE_API_URL en las variables de entorno de Vercel
vercel deploy
```

**Backend + DB → Railway o Render**

1. Crear servicio PostgreSQL y copiar `DATABASE_URL`
2. Crear servicio Node.js apuntando a `/backend`
3. Configurar todas las variables de entorno del backend
4. El backend detecta `DATABASE_URL` automáticamente y usa SSL

---

## Notas

- Los turnos son de **2 horas** de duración. Los slots disponibles son: 8:00, 10:00, 12:00, 14:00, 16:00 y 18:00.
- El estudio no atiende los **domingos**. Los sábados están habilitados.
- La zona horaria usada en toda la lógica de "hoy" y "hora actual" es **America/Argentina/Buenos_Aires**.
- Las notificaciones de WhatsApp requieren una instancia activa de **Evolution API** con sesión conectada.
