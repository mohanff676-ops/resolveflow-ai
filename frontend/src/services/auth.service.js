import api from './api.js';

export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    if (response.data?.success && response.data?.data?.token) {
      localStorage.setItem('resolveflow_token', response.data.data.token);
      localStorage.setItem('resolveflow_user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  async register(name, email, password) {
    const response = await api.post('/auth/register', { name, email, password });
    if (response.data?.success && response.data?.data?.token) {
      localStorage.setItem('resolveflow_token', response.data.data.token);
      localStorage.setItem('resolveflow_user', JSON.stringify(response.data.data.user));
    }
    return response.data;
  },

  async getMe() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout() {
    localStorage.removeItem('resolveflow_token');
    localStorage.removeItem('resolveflow_user');
  },

  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('resolveflow_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  getToken() {
    return localStorage.getItem('resolveflow_token');
  },
};

export default authService;
