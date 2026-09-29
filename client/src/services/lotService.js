import api from './api';

export const lotService = {
  async getAllLots() {
    const res = await api.get('/lots');
    return res.data;
  },

  async getLotById(id) {
    const res = await api.get(`/lots/${id}`);
    return res.data;
  },

  async getSlotsByLot(lotId, floor = null) {
    const url = floor ? `/slots/lot/${lotId}?floor=${floor}` : `/slots/lot/${lotId}`;
    const res = await api.get(url);
    return res.data;
  },

  async updateSlotStatus(slotId, status) {
    const res = await api.put(`/slots/${slotId}/status`, { status });
    return res.data;
  },

  async reassignSlot(booking_id, new_slot_id, reason) {
    const res = await api.post('/slots/reassign', { booking_id, new_slot_id, reason });
    return res.data;
  }
};
