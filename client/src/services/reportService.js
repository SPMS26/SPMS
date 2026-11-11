import api from './api';

export const reportService = {
  async submitReport(report) {
    const res = await api.post('/reports', report);
    return res.data;
  },

  async getReports() {
    const res = await api.get('/reports');
    return res.data;
  },

  async updateStatus(id, status, admin_response) {
    const res = await api.put(`/reports/${id}/status`, { status, admin_response });
    return res.data;
  }
};
