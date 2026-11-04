import api from './api';

export const adminService = {
  async getUsers() {
    const res = await api.get('/admin/users');
    return res.data;
  },

  async getSecurityStaff() {
    const res = await api.get('/admin/security');
    return res.data;
  },

  async createSecurity(payload) {
    const res = await api.post('/admin/security', payload);
    return res.data;
  },

  async updateSecurity(id, payload) {
    const res = await api.put(`/admin/security/${id}`, payload);
    return res.data;
  },

  async deleteSecurity(id) {
    const res = await api.delete(`/admin/security/${id}`);
    return res.data;
  },

  async getScanHistory() {
    const res = await api.get('/admin/scan-history');
    return res.data;
  }
};
