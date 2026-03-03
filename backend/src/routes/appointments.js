import { Router } from 'express';
import {
  getAppointments,
  getAllAppointments,
  getAvailableSlots,
  createAppointment,
  updateAppointmentStatus,
  deleteAppointment,
  getStats
} from '../controllers/appointments.js';
import { authMiddleware } from '../controllers/auth.js';
import { bookingLimiter } from '../index.js';

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

export default router;
