import api from './api';

export const userService = {
  async updateProfile(payload) {
    const res = await api.put('/users/profile', payload);
    return res.data;
  },

  async changePassword(password) {
    const res = await api.put('/users/password', { password });
    return res.data;
  },

  async addVehicle(vehicle) {
    const res = await api.post('/users/vehicles', vehicle);
    return res.data;
  },

  async deleteVehicle(id) {
    const res = await api.delete(`/users/vehicles/${id}`);
    return res.data;
  },

  async setDefaultVehicle(id) {
    const res = await api.put(`/users/vehicles/${id}/default`);
    return res.data;
  }
};
