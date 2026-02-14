const BASE = '/api';

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

export const api = {
  // Auth
  login: (username, password) => fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  }).then(r => r.json()),
  
  verifyToken: () => fetch(`${BASE}/auth/verify`, {
    headers: authHeaders(),
  }).then(r => r.json()),

  // Appointments - calendar
  getAppointments: (from, to) => {
    const params = from && to ? `?from=${from}&to=${to}` : '';
    return fetch(`${BASE}/appointments${params}`).then(r => r.json());
  },
  getAllAppointments: () => fetch(`${BASE}/appointments/all`, {
    headers: authHeaders(),
  }).then(r => r.json()),
  getStats: () => fetch(`${BASE}/appointments/stats`, {
    headers: authHeaders(),
  }).then(r => r.json()),
  getSlots: (date) => fetch(`${BASE}/appointments/slots/${date}`).then(r => r.json()),
  createAppointment: (data) => fetch(`${BASE}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(r => r.json()),
  updateStatus: (id, status) => fetch(`${BASE}/appointments/${id}/status`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  }).then(r => r.json()),
  deleteAppointment: (id) => fetch(`${BASE}/appointments/${id}`, { 
    method: 'DELETE',
    headers: authHeaders(),
  }).then(r => r.json()),

  // Gallery
  getGallery: (category) => {
    const params = category ? `?category=${category}` : '';
    return fetch(`${BASE}/gallery${params}`).then(r => r.json());
  },
  getGalleryCategories: () => fetch(`${BASE}/gallery/categories`).then(r => r.json()),
  addGalleryItem: (data) => fetch(`${BASE}/gallery`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  }).then(r => r.json()),
  updateGalleryItem: (id, data) => fetch(`${BASE}/gallery/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  }).then(r => r.json()),
  deleteGalleryItem: (id) => fetch(`${BASE}/gallery/${id}`, { 
    method: 'DELETE',
    headers: authHeaders(),
  }).then(r => r.json()),
};
