# 🎨 Nail Studio - Sistema con Login y Gestión de Galería

## 🆕 Nuevas Funcionalidades

### ✅ Sistema de Login para Admin
- Login seguro con JWT (JSON Web Tokens)
- Sesión persistente (7 días)
- Protección de rutas administrativas

### ✅ Gestión Completa de Galería
- Agregar imágenes con URL
- Editar título y categoría
- Eliminar imágenes
- Categorías: General, Semipermanente, Press-on, Polygel, Esmaltado
- Actualizaciones en tiempo real con SSE

## 📦 Instalación

### Requisitos
- Node.js 18+
- PostgreSQL 14+

### Paso 1: Backend

```bash
cd backend

# Instalar dependencias (incluye jsonwebtoken)
npm install

# Crear archivo .env
cat > .env << EOF
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nail_salon
DB_USER=postgres
DB_PASSWORD=postgres
FRONTEND_URL=http://localhost:5173

# Credenciales del admin (cambiar en producción)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Secret para JWT (cambiar en producción)
JWT_SECRET=tu-secreto-super-seguro-cambiar-en-produccion
EOF

# Iniciar servidor
npm start
```

### Paso 2: Base de Datos

```sql
-- La tabla appointments ya existe, solo agregamos una mejora:
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- La tabla gallery ya existe con su estructura actual
```

### Paso 3: Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar desarrollo
npm run dev
```

## 🔐 Credenciales por Defecto

**Usuario:** admin  
**Contraseña:** admin123

⚠️ **IMPORTANTE:** Cambiar estas credenciales en producción editando el archivo `.env` del backend.

## 🚀 Uso del Sistema

### Para Usuarios (sin login)
1. Ver galería de trabajos
2. Reservar turnos
3. Ver turnos disponibles

### Para Admin (con login)

#### 1. Iniciar Sesión
- Click en "Admin" en el navbar
- Ingresar credenciales
- El token se guarda por 7 días

#### 2. Gestionar Turnos
- Click en "Admin" → "Turnos"
- Vista semanal o lista
- Confirmar, cancelar, completar o eliminar turnos
- Ver estadísticas

#### 3. Gestionar Galería
- Click en "Admin" → "Galería"
- **Agregar imagen:**
  1. Click en "Agregar Imagen"
  2. Pegar URL de la imagen
  3. Agregar título (opcional)
  4. Seleccionar categoría
  5. Click en "Agregar"

- **Editar imagen:**
  1. Click en el ícono de lápiz
  2. Modificar título o categoría
  3. Click en "Actualizar"

- **Eliminar imagen:**
  1. Click en el ícono de basura
  2. Confirmar eliminación

#### 4. Cerrar Sesión
- Click en "Admin" → "Cerrar sesión"

## 🔧 Configuración de Producción

### Variables de Entorno Importantes

```bash
# Backend .env
ADMIN_USERNAME=tu_usuario_seguro
ADMIN_PASSWORD=tu_contraseña_segura_minimo_12_caracteres
JWT_SECRET=un-secret-muy-largo-y-aleatorio-de-al-menos-32-caracteres
NODE_ENV=production
```

### Recomendaciones de Seguridad

1. **Credenciales fuertes:**
   - Usuario: mínimo 6 caracteres
   - Contraseña: mínimo 12 caracteres, letras, números y símbolos

2. **JWT Secret:**
   - Usar un string aleatorio largo (32+ caracteres)
   - Generador: `openssl rand -base64 32`

3. **HTTPS:**
   - En producción, siempre usar HTTPS
   - El token solo se envía por conexión segura

4. **Database:**
   - Usar credenciales específicas para la app
   - No usar el usuario `postgres` por defecto

## 📁 Estructura de Archivos Nuevos

```
backend/
├── src/
│   ├── controllers/
│   │   ├── auth.js          ← NUEVO: Login y verificación de JWT
│   │   └── gallery.js       ← ACTUALIZADO: Más funcionalidades
│   └── routes/
│       ├── auth.js          ← NUEVO: Rutas de autenticación
│       └── gallery.js       ← ACTUALIZADO: Rutas protegidas

frontend/
├── src/
│   ├── components/
│   │   ├── Login.jsx        ← NUEVO: Componente de login
│   │   ├── Login.css        ← NUEVO: Estilos del login
│   │   ├── GalleryManager.jsx  ← NUEVO: Gestión de galería
│   │   ├── GalleryManager.css  ← NUEVO: Estilos de galería
│   │   └── Navbar.jsx       ← ACTUALIZADO: Dropdown con opciones admin
│   ├── api.js               ← ACTUALIZADO: Auth headers y nuevos endpoints
│   └── App.jsx              ← ACTUALIZADO: Rutas y verificación de auth
```

## 🐛 Troubleshooting

### Error: "Token inválido o expirado"
- La sesión expiró (7 días)
- Volver a iniciar sesión

### Error: "No autorizado"
- No hay token o es inválido
- Iniciar sesión nuevamente

### Error al agregar imagen
- Verificar que la URL sea válida
- La imagen debe ser accesible públicamente
- Formato soportado: JPG, PNG, WEBP

### No se ven las actualizaciones de la galería
- Refrescar la página
- Verificar que el backend esté corriendo
- Revisar la consola por errores

## 📝 Notas

- El sistema usa JWT para autenticación stateless
- Los tokens expiran en 7 días
- Las imágenes deben estar hosteadas externamente (no se suben al servidor)
- Todas las rutas de modificación están protegidas por autenticación
- Las actualizaciones se reflejan en tiempo real gracias a Server-Sent Events (SSE)

## 🔄 Próximas Mejoras Sugeridas

1. **Upload de imágenes directo** (Cloudinary, S3)
2. **Base de datos de usuarios** con bcrypt para passwords
3. **Roles y permisos** (admin, editor, viewer)
4. **Recuperación de contraseña**
5. **2FA (autenticación de dos factores)**
6. **Historial de cambios** en galería

## 📞 Soporte

Si tenés problemas:
1. Verificar logs del backend: `npm start`
2. Verificar consola del navegador (F12)
3. Revisar que la base de datos esté corriendo
4. Confirmar que todas las dependencias estén instaladas
