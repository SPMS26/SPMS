import api from './api';

export const notificationService = {
  async getNotifications() {
    const res = await api.get('/notifications');
    return res.data;
  },

  async markAsRead(id = 'all') {
    const res = await api.put(`/notifications/${id}/read`);
    return res.data;
  }
};
