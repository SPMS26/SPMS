import api from './api';

export const authService = {
  async login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.token) {
      localStorage.setItem('spms_jwt_token', res.data.token);
      localStorage.setItem('spms_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async register(userData) {
    const res = await api.post('/auth/register', userData);
    if (res.data.token) {
      localStorage.setItem('spms_jwt_token', res.data.token);
      localStorage.setItem('spms_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async getMe() {
    const res = await api.get('/auth/me');
    return res.data;
  },

  logout() {
    localStorage.removeItem('spms_jwt_token');
    localStorage.removeItem('spms_user');
    window.location.href = '/login';
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('spms_user');
    return userStr ? JSON.parse(userStr) : null;
  }
};
