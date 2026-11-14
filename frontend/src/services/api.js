import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // Agent execution workflows may take 15-45 seconds
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('resolveflow_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (err) => Promise.reject(err)
);

// Response interceptor for token expiry handling
api.interceptors.response.use(
  (response) => response,
  (err) => {
    if (err.response?.status === 401) {
      // If unauthorized on protected routes, wipe token
      if (
        !window.location.pathname.includes('/login') &&
        !window.location.pathname.includes('/register')
      ) {
        localStorage.removeItem('resolveflow_token');
        localStorage.removeItem('resolveflow_user');
      }
    }
    return Promise.reject(err);
  }
);

export default api;
