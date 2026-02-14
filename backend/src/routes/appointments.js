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

const router = Router();

router.get('/', getAppointments);
router.get('/all', getAllAppointments);
router.get('/stats', getStats);
router.get('/slots/:date', getAvailableSlots);
router.post('/', createAppointment);
router.patch('/:id/status', updateAppointmentStatus);
router.delete('/:id', deleteAppointment);

export default router;
