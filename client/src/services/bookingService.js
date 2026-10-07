import api from './api';

export const bookingService = {
  async getBookingConfig(lotId = null) {
    const res = await api.get('/bookings/config', { params: lotId ? { lot_id: lotId } : {} });
    return res.data;
  },

  async createPreBooking(slot_id, vehicle_id, booking_start, duration_hours) {
    const res = await api.post('/bookings/pre-book', { slot_id, vehicle_id, booking_start, duration_hours });
    return res.data;
  },

  async confirmPayment(bookingId) {
    const res = await api.post(`/bookings/${bookingId}/confirm-payment`);
    return res.data;
  },

  async getUserBookings() {
    const res = await api.get('/bookings');
    return res.data;
  }
};
