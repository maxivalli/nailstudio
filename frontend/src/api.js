// En producción usa VITE_API_URL (variable de entorno de Vercel)
// En desarrollo usa el proxy de Vite (/api → localhost:3001)
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

// Helper para obtener la URL completa del SSE (sin el /api)
export const getSSEUrl = () => {
  return import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api/events`
    : '/api/events';
};

// SSE admin: EventSource no soporta headers, el token va como query param
export const getAdminSSEUrl = () => {
  const token = localStorage.getItem('admin_token');
  const base = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api/events/admin`
    : '/api/events/admin';
  return token ? `${base}?token=${encodeURIComponent(token)}` : null;
};

// Helper para obtener token
const getToken = () => localStorage.getItem('admin_token');

// Helper para headers con autenticación
const authHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Wrapper seguro: maneja errores de red y respuestas no-JSON (ej: 502 de Nginx)
const safeFetch = async (url, options) => {
  try {
    const r = await fetch(url, options);
    const contentType = r.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { success: false, error: `Error del servidor (${r.status}). Intentá de nuevo.` };
    }
    return await r.json();
  } catch {
    return { success: false, error: 'Error de conexión. Verificá tu internet e intentá de nuevo.' };
  }
};

export const api = {
  // Auth
  login: (username, password) => safeFetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  }),

  verifyToken: () => safeFetch(`${BASE}/auth/verify`, {
    headers: authHeaders(),
  }),

  // Appointments - calendar
  getAppointments: (from, to) => {
    const params = from && to ? `?from=${from}&to=${to}` : '';
    return safeFetch(`${BASE}/appointments${params}`);
  },
  getAllAppointments: () => safeFetch(`${BASE}/appointments/all`, {
    headers: authHeaders(),
  }),
  getStats: () => safeFetch(`${BASE}/appointments/stats`, {
    headers: authHeaders(),
  }),
  getSlots: (date) => safeFetch(`${BASE}/appointments/slots/${date}`),
  createAppointment: (data) => safeFetch(`${BASE}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  updateStatus: (id, status) => safeFetch(`${BASE}/appointments/${id}/status`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  }),
  deleteAppointment: (id) => safeFetch(`${BASE}/appointments/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }),

  // Gallery
  getGallery: (category) => {
    const params = category ? `?category=${category}` : '';
    return safeFetch(`${BASE}/gallery${params}`);
  },
  getGalleryCategories: () => safeFetch(`${BASE}/gallery/categories`),
  addGalleryItem: (data) => safeFetch(`${BASE}/gallery`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  }),
  updateGalleryItem: (id, data) => safeFetch(`${BASE}/gallery/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  }),

  // Services
  getServices: () => safeFetch(`${BASE}/services`),
  createService: (data) => safeFetch(`${BASE}/services`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  }),
  updateService: (id, data) => safeFetch(`${BASE}/services/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  }),

  // Analytics
  getServiceStats: () => safeFetch(`${BASE}/appointments/analytics/services`, {
    headers: authHeaders(),
  }),
  getFrequentClients: () => safeFetch(`${BASE}/appointments/analytics/clients`, {
    headers: authHeaders(),
  }),
  getClientHistory: (whatsapp) => safeFetch(`${BASE}/appointments/analytics/client/${encodeURIComponent(whatsapp)}`, {
    headers: authHeaders(),
  }),

  deleteService: (id) => safeFetch(`${BASE}/services/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }),

  deleteGalleryItem: (id) => safeFetch(`${BASE}/gallery/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }),
};