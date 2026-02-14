import React, { useState, useEffect } from 'react';
import { api } from '../api';
import './GalleryManager.css';

const GalleryManager = ({ onClose }) => {
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ image_url: '', title: '', category: 'general' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchGallery = async () => {
    try {
      const res = await api.getGallery();
      if (res.success) {
        setGallery(res.data);
      }
    } catch (err) {
      console.error('Error fetching gallery:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.image_url.trim()) {
      setError('La URL de la imagen es requerida');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.addGalleryItem(formData);
      if (res.success) {
        setGallery(prev => [res.data, ...prev]);
        setFormData({ image_url: '', title: '', category: 'general' });
        setShowAddForm(false);
      } else {
        setError(res.error || 'Error al agregar imagen');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await api.updateGalleryItem(editingItem.id, {
        title: formData.title,
        category: formData.category
      });
      if (res.success) {
        setGallery(prev => prev.map(item => item.id === editingItem.id ? res.data : item));
        setEditingItem(null);
        setFormData({ image_url: '', title: '', category: 'general' });
      } else {
        setError(res.error || 'Error al actualizar');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta imagen permanentemente?')) return;

    try {
      const res = await api.deleteGalleryItem(id);
      if (res.success) {
        setGallery(prev => prev.filter(item => item.id !== id));
      }
    } catch (err) {
      console.error('Error deleting:', err);
    }
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setFormData({
      image_url: item.image_url,
      title: item.title || '',
      category: item.category || 'general'
    });
    setShowAddForm(false);
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingItem(null);
    setFormData({ image_url: '', title: '', category: 'general' });
    setError('');
  };

  return (
    <div className="gallery-manager-overlay">
      <div className="gallery-manager">
        <div className="gallery-manager__header">
          <div>
            <div className="gallery-manager__eyebrow">Gestión de</div>
            <h2 className="gallery-manager__title">Galería</h2>
          </div>
          <button className="gallery-manager__close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 3L15 15M15 3L3 15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="gallery-manager__actions">
          <button
            className="gallery-btn gallery-btn--primary"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {showAddForm ? 'Cancelar' : 'Agregar Imagen'}
          </button>
        </div>

        {(showAddForm || editingItem) && (
          <form onSubmit={editingItem ? handleUpdate : handleAdd} className="gallery-form fade-in">
            <div className="gallery-form__title">
              {editingItem ? 'Editar Imagen' : 'Nueva Imagen'}
            </div>

            {!editingItem && (
              <div className="gallery-field">
                <label>URL de la imagen *</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData(p => ({ ...p, image_url: e.target.value }))}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  required
                  disabled={submitting}
                />
              </div>
            )}

            <div className="gallery-field">
              <label>Título (opcional)</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                placeholder="Ej: Diseño floral"
                disabled={submitting}
              />
            </div>

            <div className="gallery-field">
              <label>Categoría</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
                disabled={submitting}
              >
                <option value="general">General</option>
                <option value="semipermanente">Semipermanente</option>
                <option value="press-on">Press-on</option>
                <option value="polygel">Polygel</option>
                <option value="esmaltado">Esmaltado</option>
              </select>
            </div>

            {error && <div className="gallery-error">{error}</div>}

            <div className="gallery-form__buttons">
              <button
                type="button"
                onClick={cancelForm}
                className="gallery-btn gallery-btn--secondary"
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="gallery-btn gallery-btn--primary"
                disabled={submitting}
              >
                {submitting ? 'Guardando...' : editingItem ? 'Actualizar' : 'Agregar'}
              </button>
            </div>
          </form>
        )}

        <div className="gallery-manager__body">
          {loading ? (
            <div className="gallery-loading">Cargando...</div>
          ) : gallery.length === 0 ? (
            <div className="gallery-empty">No hay imágenes en la galería</div>
          ) : (
            <div className="gallery-grid">
              {gallery.map(item => (
                <div key={item.id} className="gallery-item">
                  <div className="gallery-item__image">
                    <img src={item.image_url} alt={item.title || 'Imagen'} />
                  </div>
                  <div className="gallery-item__info">
                    <div className="gallery-item__title">
                      {item.title || 'Sin título'}
                    </div>
                    <div className="gallery-item__category">{item.category}</div>
                  </div>
                  <div className="gallery-item__actions">
                    <button
                      onClick={() => startEdit(item)}
                      className="gallery-item__btn"
                      title="Editar"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M10 1L13 4L5 12H2V9L10 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="gallery-item__btn gallery-item__btn--delete"
                      title="Eliminar"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M1.5 3H12.5M4.5 3V2H9.5V3M4.5 5.5V10.5M9.5 5.5V10.5M2.5 3L3 12H11L11.5 3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GalleryManager;
