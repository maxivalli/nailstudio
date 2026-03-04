import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, error: 'No autorizado.' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Token inválido o expirado.' });
  }
};
