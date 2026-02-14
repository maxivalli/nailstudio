import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminPanel from './AdminPanel';
import GalleryManager from './GalleryManager';
import './Navbar.css';

const Navbar = ({ isAuthenticated, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [galleryManagerOpen, setGalleryManagerOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const scrollTo = (id) => {
    if (location.pathname !== '/home') {
      navigate('/home');
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 300);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAdminClick = () => {
    if (isAuthenticated) {
      setAdminOpen(true);
      setShowMenu(false);
    } else {
      navigate('/login');
    }
  };

  const handleGalleryClick = () => {
    if (isAuthenticated) {
      setGalleryManagerOpen(true);
      setShowMenu(false);
    } else {
      navigate('/login');
    }
  };

  const handleLogout = () => {
    onLogout();
    setShowMenu(false);
    navigate('/home');
  };

  return (
    <>
      <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
        <button className="navbar__logo" onClick={() => navigate('/home')}>
          <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="23" stroke="currentColor" strokeWidth="1"/>
            <path d="M24 8 C24 8, 34 18, 34 26 C34 31.5 29.5 36 24 36 C18.5 36 14 31.5 14 26 C14 18 24 8 24 8Z" fill="none" stroke="currentColor" strokeWidth="1"/>
            <circle cx="24" cy="26" r="3" fill="currentColor" opacity="0.5"/>
          </svg>
          <span>SY <em>Studio</em></span>
        </button>

        <div className="navbar__links">
          <button className="navbar__link" onClick={() => scrollTo('gallery')}>Trabajos</button>
          <button className="navbar__link" onClick={() => scrollTo('queue')}>Turnos</button>
          
          {isAuthenticated ? (
            <div className="navbar__dropdown">
              <button className="navbar__admin navbar__admin--auth" onClick={() => setShowMenu(!showMenu)}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="4" r="2.5" stroke="currentColor" strokeWidth="1"/>
                  <path d="M2 12C2 9.8 4.24 8 7 8C9.76 8 12 9.8 12 12" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                </svg>
                Admin
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ marginLeft: '4px' }}>
                  <path d="M2 3L5 6L8 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </button>
              
              {showMenu && (
                <div className="navbar__menu">
                  <button onClick={handleAdminClick}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="1" y="1" width="4" height="4" stroke="currentColor" strokeWidth="1"/>
                      <rect x="9" y="1" width="4" height="4" stroke="currentColor" strokeWidth="1"/>
                      <rect x="1" y="9" width="4" height="4" stroke="currentColor" strokeWidth="1"/>
                      <rect x="9" y="9" width="4" height="4" stroke="currentColor" strokeWidth="1"/>
                    </svg>
                    Turnos
                  </button>
                  <button onClick={handleGalleryClick}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="1" y="1" width="12" height="9" stroke="currentColor" strokeWidth="1"/>
                      <circle cx="4.5" cy="4.5" r="1.5" stroke="currentColor" strokeWidth="1"/>
                      <path d="M1 8L4 5L7 8L10 5L13 8" stroke="currentColor" strokeWidth="1"/>
                    </svg>
                    Galería
                  </button>
                  <button onClick={handleLogout} className="navbar__menu-logout">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M5 1H2C1.4 1 1 1.4 1 2V12C1 12.6 1.4 13 2 13H5M9 10L13 7M13 7L9 4M13 7H5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="navbar__admin" onClick={() => navigate('/login')}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="4" r="2.5" stroke="currentColor" strokeWidth="1"/>
                <path d="M2 12C2 9.8 4.24 8 7 8C9.76 8 12 9.8 12 12" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
              </svg>
              Admin
            </button>
          )}
        </div>
      </nav>
      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
      {galleryManagerOpen && <GalleryManager onClose={() => setGalleryManagerOpen(false)} />}
    </>
  );
};

export default Navbar;
