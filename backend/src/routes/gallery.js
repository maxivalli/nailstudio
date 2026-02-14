import { Router } from 'express';
import { 
  getGallery, 
  addGalleryItem, 
  updateGalleryItem,
  deleteGalleryItem,
  getCategories 
} from '../controllers/gallery.js';
import { authMiddleware } from '../controllers/auth.js';

const router = Router();

// Rutas públicas
router.get('/', getGallery);
router.get('/categories', getCategories);

// Rutas protegidas (requieren autenticación)
router.post('/', authMiddleware, addGalleryItem);
router.put('/:id', authMiddleware, updateGalleryItem);
router.delete('/:id', authMiddleware, deleteGalleryItem);

export default router;

