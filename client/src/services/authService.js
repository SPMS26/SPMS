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

  async getAdminRegistrationConfig() {
    const res = await api.get('/auth/admin/config');
    return res.data;
  },

  async registerAdmin(details) {
    const res = await api.post('/auth/admin/register', details);
    return res.data;
  },

  async payAdminRegistration(registrationId, payment_method) {
    const res = await api.post(`/auth/admin/register/${registrationId}/pay`, { payment_method });
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

    clearSession() {
    localStorage.removeItem('spms_jwt_token');
    localStorage.removeItem('spms_user');
  },

  logout() {
    this.clearSession();
    window.location.href = '/login';
  }
};
