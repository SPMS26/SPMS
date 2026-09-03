import api from './api';

export const paymentService = {
  async createOrder(booking_id, amount) {
    const res = await api.post('/payments/create-order', { booking_id, amount });
    return res.data;
  },

  async verifyPayment(order_id, booking_id) {
    const res = await api.post('/payments/verify', { order_id, booking_id });
    return res.data;
  },

  async getHistory() {
    const res = await api.get('/payments/history');
    return res.data;
  }
};
