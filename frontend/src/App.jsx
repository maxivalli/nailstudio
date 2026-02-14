import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Home from './pages/Home';
import Navbar from './components/Navbar';
import Login from './components/Login';
import { api } from './api';

const AppLayout = ({ children, isAuthenticated, onLogout }) => (
  <>
    <Navbar isAuthenticated={isAuthenticated} onLogout={onLogout} />
    {children}
  </>
);

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Verificar si hay token guardado
    const checkAuth = async () => {
      const token = localStorage.getItem('admin_token');
      if (token) {
        try {
          const res = await api.verifyToken();
          setIsAuthenticated(res.success);
        } catch (err) {
          setIsAuthenticated(false);
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_username');
        }
      }
      setChecking(false);
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = (data) => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_username');
    setIsAuthenticated(false);
  };

  if (checking) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/home" element={
          <AppLayout isAuthenticated={isAuthenticated} onLogout={handleLogout}>
            <Home 
              isAuthenticated={isAuthenticated} 
              onShowLogin={() => {}}
            />
          </AppLayout>
        } />
        <Route path="/login" element={
          isAuthenticated ? (
            <Navigate to="/home" replace />
          ) : (
            <Login onLoginSuccess={handleLoginSuccess} />
          )
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
