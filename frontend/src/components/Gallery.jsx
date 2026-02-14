import React, { useState, useEffect } from 'react';
import { api } from '../api';
import './Gallery.css';

const Gallery = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const res = await api.getGallery();
        if (res.success && res.data.length > 0) {
          const mapped = res.data.map(item => ({
            id: item.id,
            url: item.image_url,
            title: item.title || 'Sin título',
            tag: item.category?.toUpperCase() || 'GENERAL',
          }));
          setItems(mapped);
        }
      } catch (err) {
        console.error('Error loading gallery:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGallery();

    // SSE para actualizaciones en tiempo real
    const es = new EventSource('/api/events');
    es.addEventListener('gallery_update', () => {
      fetchGallery();
    });
    es.onerror = () => es.close();
    
    return () => es.close();
  }, []);

  if (loading) {
    return (
      <div className="gallery">
        <div className="gallery__loading">
          <div className="gallery__spinner"></div>
          <p>Cargando galería...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="gallery">
        <div className="gallery__empty">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <rect x="8" y="8" width="48" height="36" stroke="currentColor" strokeWidth="2" rx="4"/>
            <circle cx="20" cy="20" r="4" stroke="currentColor" strokeWidth="2"/>
            <path d="M8 36L20 24L32 36L44 24L56 36" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <h3>No hay imágenes en la galería</h3>
          <p>Las imágenes agregadas aparecerán aquí</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gallery">
      <div className="gallery__grid">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="gallery__item"
            style={{ animationDelay: `${idx * 0.08}s` }}
            onClick={() => setActive(item)}
          >
            <div className="gallery__img-wrap">
              <img
                src={item.url}
                alt={item.title}
                loading="lazy"
                onError={(e) => {
                  e.target.src = `https://placehold.co/400x400/F5F2EC/8C7B6E?text=${encodeURIComponent(item.title)}`;
                }}
              />
              <div className="gallery__overlay">
                <span className="gallery__tag">{item.tag}</span>
                <span className="gallery__title">{item.title}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {active && (
        <div className="gallery__lightbox fade-in" onClick={() => setActive(null)}>
          <button className="gallery__close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 4L16 16M16 4L4 16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
          <div className="gallery__lightbox-content" onClick={e => e.stopPropagation()}>
            <img src={active.url} alt={active.title} />
            <div className="gallery__lightbox-info">
              <span className="gallery__tag">{active.tag}</span>
              <span className="gallery__title">{active.title}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;
