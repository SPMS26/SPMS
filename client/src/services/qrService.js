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

  async confirmExitPayment(payload) {
    const res = await api.post('/qr/confirm-exit-payment', payload);
    return res.data;
  },

  async autoValidate(qr_data = null, extra = {}) {
    const res = await api.post('/qr/auto-validate', { qr_data, ...extra });
    return res.data;
  },

  async walkIn(slot_id, vehicle_number, phone = '') {
    const res = await api.post('/qr/walk-in', { slot_id, vehicle_number, phone });
    return res.data;
  },

  async getWalkInSessions() {
    const res = await api.get('/qr/walk-ins');
    return res.data;
  },

  async getGateQueue() {
    const res = await api.get('/qr/gate-queue');
    return res.data;
  }
};
