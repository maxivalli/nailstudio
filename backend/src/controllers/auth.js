import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET no está definido en las variables de entorno.');
  process.exit(1);
}

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  console.error('FATAL: ADMIN_PASSWORD no está definido en las variables de entorno.');
  process.exit(1);
}

const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: ADMIN_PASSWORD,
};
const JWT_EXPIRES_IN = '12h';

export const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Usuario y contraseña son requeridos' 
    });
  }

  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    const token = jwt.sign(
      { username, role: 'admin', timestamp: Date.now() },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      success: true,
      data: { token, username, role: 'admin' }
    });
  }

  return res.status(401).json({
    success: false,
    error: 'Usuario o contraseña incorrectos'
  });
};

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
    return res.json({
      success: true,
      data: { username: decoded.username, role: decoded.role }
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Token inválido o expirado'
    });
  }
};

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

// Middleware especial para SSE: EventSource del browser no soporta headers,
// así que el token se pasa como query param ?token=...
export const authMiddlewareSSE = async (req, res, next) => {
  const token = req.query.token;

  if (!token) {
    res.status(401).end('No autorizado');
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).end('Token inválido o expirado');
  }
};