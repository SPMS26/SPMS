import api from './api';

export const adminService = {
  async getUsers() {
    const res = await api.get('/admin/users');
    return res.data;
  },

  async getScanHistory() {
    const res = await api.get('/admin/scan-history');
    return res.data;
  },

  async getAdminLogs() {
    const res = await api.get('/admin/logs');
    return res.data;
  }
};
