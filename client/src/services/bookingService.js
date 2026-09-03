import api from './api';

export const bookingService = {
  async createLiveBooking(slot_id, vehicle_id) {
    const res = await api.post('/bookings/live-book', { slot_id, vehicle_id });
    return res.data;
  },

  async createPreBooking(slot_id, vehicle_id, booking_start, duration_hours) {
    const res = await api.post('/bookings/pre-book', { slot_id, vehicle_id, booking_start, duration_hours });
    return res.data;
  },

  async getUserBookings() {
    const res = await api.get('/bookings');
    return res.data;
  },

  async getBookingById(id) {
    const res = await api.get(`/bookings/${id}`);
    return res.data;
  }
};
