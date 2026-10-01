import api from './api';

export const analyticsService = {
  async getKPIs() {
    const res = await api.get('/analytics/kpis');
    return res.data;
  },

  async getMonthlyHistory() {
    const res = await api.get('/analytics/monthly');
    return res.data;
  },

  async getPeakTimes() {
    const res = await api.get('/analytics/peak-times');
    return res.data;
  },

  async getDayWiseRevenue() {
    const res = await api.get('/analytics/daily-revenue');
    return res.data;
  }
};
