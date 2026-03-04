import { Router } from 'express';
import {
  getAppointments,
  getAllAppointments,
  getAvailableSlots,
  createAppointment,
  updateAppointmentStatus,
  deleteAppointment,
  getStats,
  getServiceStats,
  getFrequentClients,
  getClientHistory
} from '../controllers/appointments.js';
import { authMiddleware } from '../controllers/auth.js';
import { bookingLimiter } from '../middleware/rateLimits.js';

const router = Router();

// Rutas públicas
router.get('/', getAppointments);
router.get('/slots/:date', getAvailableSlots);
router.post('/', bookingLimiter, createAppointment);

// Rutas protegidas (requieren autenticación de admin)
router.get('/all', authMiddleware, getAllAppointments);
router.get('/stats', authMiddleware, getStats);
router.patch('/:id/status', authMiddleware, updateAppointmentStatus);
router.delete('/:id', authMiddleware, deleteAppointment);
router.get('/analytics/services', authMiddleware, getServiceStats);
router.get('/analytics/clients', authMiddleware, getFrequentClients);
router.get('/analytics/client/:whatsapp', authMiddleware, getClientHistory);

export default router;