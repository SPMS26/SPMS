import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { lotService } from '../services/lotService';
import { sortFloors, floorLabel } from '../components/parking/SlotGrid';
import toast from 'react-hot-toast';

const AdminLotsPage = () => {
  const [lots, setLots] = useState([]);
  const [selectedLot, setSelectedLot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSlot, setNewSlot] = useState({ slot_number: '', floor: '', hourly_price: '' });
  const [savingSlot, setSavingSlot] = useState(false);

  const fetchLots = async () => {
    try {
      const res = await lotService.getAllLots();
      setLots(res.lots || []);
      if (res.lots && res.lots.length > 0) {
        // Keep the current selection but pick up its refreshed counts and floors
        setSelectedLot(prev => (prev && res.lots.find(l => l.id === prev.id)) || res.lots[0]);
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
  }, [selectedLot?.id]);

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

  const handleAddSlot = async (e) => {
    e.preventDefault();
    if (!selectedLot) return;
    setSavingSlot(true);
    try {
      const res = await lotService.addSlot({
        lot_id: selectedLot.id,
        slot_number: newSlot.slot_number,
        floor: newSlot.floor,
        hourly_price: newSlot.hourly_price
      });
      toast.success(res.message);
      setNewSlot(prev => ({ ...prev, slot_number: '' }));
      await Promise.all([fetchSlots(selectedLot.id), fetchLots()]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add slot.');
    } finally {
      setSavingSlot(false);
    }
  };

  const handleDeleteSlot = async (slot) => {
    if (!window.confirm(`Delete slot ${slot.slot_number} from ${selectedLot.name}?`)) return;
    try {
      const res = await lotService.deleteSlot(slot.id);
      toast.success(res.message);
      setSlots(prev => prev.filter(s => s.id !== slot.id));
      fetchLots();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete slot.');
    }
  };

  const lotFloors = selectedLot ? sortFloors(selectedLot.floors) : [];

  return (
    <AppLayout>
      <div className="page-header-row">
        <div className="page-title-box">
          <h1>Parking Lots & Slots Management</h1>
          <p>Configure pricing, slot availability, maintenance mode, and capacity</p>
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

          <form onSubmit={handleAddSlot} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'flex-end', marginBottom: '1.25rem', padding: '0.85rem', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.3rem' }}>Slot Code</label>
              <input
                className="search-input"
                style={{ width: '110px' }}
                placeholder="e.g. A11"
                maxLength={10}
                value={newSlot.slot_number}
                onChange={(e) => setNewSlot(prev => ({ ...prev, slot_number: e.target.value }))}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.3rem' }}>Floor</label>
              <input
                className="search-input"
                style={{ width: '110px' }}
                list="lot-floors"
                placeholder="Floor"
                maxLength={20}
                value={newSlot.floor}
                onChange={(e) => setNewSlot(prev => ({ ...prev, floor: e.target.value }))}
                required
              />
              <datalist id="lot-floors">
                {lotFloors.map(f => <option key={f} value={f}>{floorLabel(f)}</option>)}
              </datalist>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.3rem' }}>Price / hr (₹)</label>
              <input
                className="search-input"
                style={{ width: '110px' }}
                type="number"
                min="0"
                step="0.01"
                placeholder="30"
                value={newSlot.hourly_price}
                onChange={(e) => setNewSlot(prev => ({ ...prev, hourly_price: e.target.value }))}
              />
            </div>
            <button type="submit" className="btn-select-slot" style={{ marginTop: 0, width: 'auto', padding: '0.6rem 1.1rem' }} disabled={!selectedLot || savingSlot}>
              <i className="fa-solid fa-plus"></i> {savingSlot ? 'Adding...' : 'Add Slot'}
            </button>
          </form>

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
                    <td><span className="type-tag" style={{ textTransform: 'capitalize' }}>{slot.slot_type}</span></td>
                    <td><strong style={{ color: 'var(--accent-gold)' }}>₹{slot.hourly_price}</strong></td>
                    <td>
                      <span className={`dot ${slot.status}`}></span>
                      <span style={{ marginLeft: '0.4rem', textTransform: 'capitalize', fontWeight: 600 }}>{slot.status}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
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
                        <button
                          className="change-btn"
                          style={{ borderColor: 'var(--status-occupied)', color: 'var(--status-occupied)' }}
                          onClick={() => handleDeleteSlot(slot)}
                        >
                          <i className="fa-solid fa-trash"></i> Delete
                        </button>
                      </div>
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
