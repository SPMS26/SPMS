import api from './api';

export const qrService = {
  async validateEntry(booking_id, qr_data = null, extra = {}) {
    const res = await api.post('/qr/validate-entry', { booking_id, qr_data, ...extra });
    return res.data;
  },

  async validateExit(booking_id, qr_data = null, extra = {}) {
    const res = await api.post('/qr/validate-exit', { booking_id, qr_data, ...extra });
    return res.data;
  },

  async autoValidate(qr_data = null, extra = {}) {
    const res = await api.post('/qr/auto-validate', { qr_data, ...extra });
    return res.data;
  },

  async getLiveQR(bookingId) {
    const res = await api.get(`/qr/booking/${bookingId}`);
    return res.data;
  },

  async getGateQueue() {
    const res = await api.get('/qr/gate-queue');
    return res.data;
  }
};
