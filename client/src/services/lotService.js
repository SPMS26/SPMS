import api from './api';

export const lotService = {
  async getAllLots() {
    const res = await api.get('/lots');
    return res.data;
  },

  async getLotById(lotId) {
    const res = await api.get(`/lots/${lotId}`);
    return res.data;
  },

  async getMyLots() {
    const res = await api.get('/lots/mine');
    return res.data;
  },

  async createLot(lot) {
    const res = await api.post('/lots', lot);
    return res.data;
  },

  async updateLot(lotId, lot) {
    const res = await api.put(`/lots/${lotId}`, lot);
    return res.data;
  },

  async deleteLot(lotId) {
    const res = await api.delete(`/lots/${lotId}`);
    return res.data;
  },

  async bulkAddSlots(payload) {
    const res = await api.post('/slots/bulk', payload);
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

  async addSlot(slot) {
    const res = await api.post('/slots', slot);
    return res.data;
  },

  async deleteSlot(slotId) {
    const res = await api.delete(`/slots/${slotId}`);
    return res.data;
  }
};
