import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { lotService } from '../services/lotService';
import toast from 'react-hot-toast';

const AdminLotsPage = () => {
  const [lots, setLots] = useState([]);
  const [selectedLot, setSelectedLot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLots = async () => {
    try {
      const res = await lotService.getAllLots();
      setLots(res.lots || []);
      if (res.lots && res.lots.length > 0 && !selectedLot) {
        setSelectedLot(res.lots[0]);
      }
    } catch (err) {
      toast.error('Failed to load parking lots.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSlots = async (lotId) => {
    try {
      const res = await lotService.getSlotsByLot(lotId);
      setSlots(res.slots || []);
    } catch (err) {
      toast.error('Failed to load slots.');
    }
  };

  useEffect(() => {
    fetchLots();
  }, []);

  useEffect(() => {
    if (selectedLot) {
      fetchSlots(selectedLot.id);
    }
  }, [selectedLot]);

  const handleStatusToggle = async (slotId, currentStatus) => {
    const nextStatus = currentStatus === 'maintenance' ? 'available' : 'maintenance';
    try {
      await lotService.updateSlotStatus(slotId, nextStatus);
      toast.success(`Slot set to ${nextStatus.toUpperCase()}`);
      setSlots(prev => prev.map(s => s.id === slotId ? { ...s, status: nextStatus } : s));
    } catch (err) {
      toast.error('Failed to update slot status.');
    }
  };

  return (
    <AppLayout>
      <div className="page-header-row">
        <div className="page-title-box">
          <h1>Parking Lots & Slots Management</h1>
          <p>Configure pricing, slot availability, maintenance mode, and capacity (Req-12, Req-14)</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem' }}>
        {/* Lots List */}
        <div className="card">
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Parking Lots</h3>
          {lots.map(lot => (
            <div
              key={lot.id}
              onClick={() => setSelectedLot(lot)}
              style={{
                padding: '0.85rem',
                borderRadius: '8px',
                marginBottom: '0.75rem',
                cursor: 'pointer',
                background: selectedLot && selectedLot.id === lot.id ? 'var(--accent-gold-bg)' : 'var(--bg-input)',
                border: selectedLot && selectedLot.id === lot.id ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{lot.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lot.address}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.78rem' }}>
                <span>Slots: <strong>{lot.total_slots}</strong></span>
                <span style={{ color: 'var(--status-available)', fontWeight: 700 }}>{lot.available_slots} Open</span>
              </div>
            </div>
          ))}
        </div>

        {/* Slot Grid Management Table */}
        <div className="card">
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>
            Slots in {selectedLot ? selectedLot.name : 'Selected Lot'}
          </h3>

          <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Slot Code</th>
                  <th>Floor</th>
                  <th>Type</th>
                  <th>Price / hr</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {slots.map(slot => (
                  <tr key={slot.id}>
                    <td><strong>Slot {slot.slot_number}</strong></td>
                    <td>{slot.floor}</td>
                    <td><span className="type-tag">Car</span></td>
                    <td><strong style={{ color: 'var(--accent-gold)' }}>₹{slot.hourly_price}</strong></td>
                    <td>
                      <span className={`dot ${slot.status}`}></span>
                      <span style={{ marginLeft: '0.4rem', textTransform: 'capitalize', fontWeight: 600 }}>{slot.status}</span>
                    </td>
                    <td>
                      <button
                        className="change-btn"
                        style={{
                          borderColor: slot.status === 'maintenance' ? 'var(--accent-emerald)' : 'var(--status-occupied)',
                          color: slot.status === 'maintenance' ? 'var(--accent-emerald)' : 'var(--status-occupied)'
                        }}
                        onClick={() => handleStatusToggle(slot.id, slot.status)}
                      >
                        {slot.status === 'maintenance' ? 'Set Available' : 'Maintenance'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminLotsPage;
