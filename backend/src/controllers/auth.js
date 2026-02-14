import jwt from 'jsonwebtoken';

// Hardcoded admin credentials (para desarrollo)
// En producción, deberías usar una base de datos con passwords hasheados
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'admin123',
};

const JWT_SECRET = process.env.JWT_SECRET || 'tu-secreto-super-seguro-cambiar-en-produccion';
const JWT_EXPIRES_IN = '7d'; // Token válido por 7 días

// Login
export const login = async (req, res) => {
  const { username, password } = req.body;

  console.log('🔐 [login] Intento de login:', { username });

  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Usuario y contraseña son requeridos' 
    });
  }

  // Verificar credenciales
  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    // Generar token JWT
    const token = jwt.sign(
      { 
        username,
        role: 'admin',
        timestamp: Date.now()
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    console.log('✅ [login] Login exitoso para:', username);

    return res.json({
      success: true,
      data: {
        token,
        username,
        role: 'admin'
      }
    });
  } else {
    console.log('❌ [login] Credenciales inválidas para:', username);
    return res.status(401).json({
      success: false,
      error: 'Usuario o contraseña incorrectos'
    });
  }
};

// Verificar token
export const verifyToken = async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No autorizado - Token no proporcionado'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ [verifyToken] Token válido para:', decoded.username);
    
    return res.json({
      success: true,
      data: {
        username: decoded.username,
        role: decoded.role
      }
    });
  } catch (err) {
    console.log('❌ [verifyToken] Token inválido:', err.message);
    return res.status(401).json({
      success: false,
      error: 'Token inválido o expirado'
    });
  }
};

// Middleware para proteger rutas
export const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No autorizado - Token no proporcionado'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Token inválido o expirado'
    });
  }
};
