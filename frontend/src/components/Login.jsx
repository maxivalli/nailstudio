import React, { useState } from 'react';
import { api } from '../api';
import './Login.css';

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim() || !password.trim()) {
      setError('Por favor completá todos los campos');
      return;
    }

    setLoading(true);
    
    try {
      const response = await api.login(username.trim(), password);
      
      if (response.success) {
        // Guardar token en localStorage
        localStorage.setItem('admin_token', response.data.token);
        localStorage.setItem('admin_username', response.data.username);
        
        // Llamar callback de éxito
        onLoginSuccess(response.data);
      } else {
        setError(response.error || 'Error al iniciar sesión');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Error de conexión. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-panel fade-in">
        <div className="login-header">
          <svg className="login-icon" width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="23" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="24" cy="20" r="7" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10 38C10 32 16 27 24 27C32 27 38 32 38 38" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <h2 className="login-title">Panel de Admin</h2>
          <p className="login-subtitle">Ingresá tus credenciales</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label className="login-label">Usuario</label>
            <input
              type="text"
              className="login-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="login-field">
            <label className="login-label">Contraseña</label>
            <input
              type="password"
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="login-error fade-in">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6.5" stroke="currentColor"/>
                <path d="M7 4V7M7 9.5V10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            className={`login-submit ${loading ? 'login-submit--loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <span className="login-spinner" />
            ) : (
              <>
                <span>Ingresar</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
