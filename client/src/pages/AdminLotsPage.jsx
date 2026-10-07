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
  const [lotForm, setLotForm] = useState(null); // null = hidden, { id?, ...fields } = create/edit
  const [savingLot, setSavingLot] = useState(false);
  const [bulk, setBulk] = useState({ sections: 'A,B', count_per_section: 10, floor: 'GF', hourly_price: '', slot_type: 'car' });
  const [savingBulk, setSavingBulk] = useState(false);

  const fetchLots = async () => {
    try {
      const res = await lotService.getMyLots();
      setLots(res.lots || []);
      if (res.lots && res.lots.length > 0) {
        // Keep the current selection but pick up its refreshed counts and floors
        setSelectedLot(prev => (prev && res.lots.find(l => l.id === prev.id)) || res.lots[0]);
      } else {
        setSelectedLot(null);
        setSlots([]);
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

  const blankLot = {
    name: '', address: '', description: '', latitude: '', longitude: '',
    opening_time: '00:00', closing_time: '23:59', contact_phone: '',
    default_hourly_price: 30, pre_booking_fee: '', four_wheeler: true, two_wheeler: true
  };

  const openEditLot = (lot) => setLotForm({
    id: lot.id,
    name: lot.name || '', address: lot.address || '', description: lot.description || '',
    latitude: lot.latitude ?? '', longitude: lot.longitude ?? '',
    opening_time: (lot.opening_time || '00:00').slice(0, 5), closing_time: (lot.closing_time || '23:59').slice(0, 5),
    contact_phone: lot.contact_phone || '',
    default_hourly_price: lot.default_hourly_price ?? 30,
    pre_booking_fee: lot.pre_booking_fee ?? '',
    four_wheeler: (lot.supported_vehicle_types || '').includes('four_wheeler'),
    two_wheeler: (lot.supported_vehicle_types || '').includes('two_wheeler')
  });

  const handleSaveLot = async (e) => {
    e.preventDefault();
    const types = [lotForm.four_wheeler && 'four_wheeler', lotForm.two_wheeler && 'two_wheeler'].filter(Boolean);
    if (types.length === 0) {
      toast.error('Select at least one supported vehicle type.');
      return;
    }
    const { id, four_wheeler, two_wheeler, ...fields } = lotForm;
    const payload = { ...fields, supported_vehicle_types: types.join(',') };
    setSavingLot(true);
    try {
      const res = id ? await lotService.updateLot(id, payload) : await lotService.createLot(payload);
      toast.success(id ? 'Lot updated.' : 'Parking lot created. Now add its slots.');
      setLotForm(null);
      if (!id) setSelectedLot(res.lot);
      await fetchLots();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save lot.');
    } finally {
      setSavingLot(false);
    }
  };

  const handleDeleteLot = async () => {
    if (!selectedLot || !window.confirm(`Remove "${selectedLot.name}"? Lots with booking history are deactivated instead of deleted.`)) return;
    try {
      const res = await lotService.deleteLot(selectedLot.id);
      toast.success(res.message);
      setSelectedLot(null);
      await fetchLots();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove lot.');
    }
  };

  const handleToggleLotActive = async () => {
    try {
      await lotService.updateLot(selectedLot.id, { is_active: !selectedLot.is_active });
      toast.success(selectedLot.is_active ? 'Lot hidden from drivers.' : 'Lot is live for drivers.');
      await fetchLots();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update lot.');
    }
  };

  const handleBulkAdd = async (e) => {
    e.preventDefault();
    if (!selectedLot) return;
    setSavingBulk(true);
    try {
      const res = await lotService.bulkAddSlots({
        lot_id: selectedLot.id,
        sections: bulk.sections.split(',').map(x => x.trim()).filter(Boolean),
        count_per_section: bulk.count_per_section,
        floor: bulk.floor,
        slot_type: bulk.slot_type,
        hourly_price: bulk.hourly_price === '' ? (selectedLot.default_hourly_price ?? 30) : bulk.hourly_price
      });
      toast.success(res.skipped ? `${res.message} ${res.skipped} already existed.` : res.message);
      await Promise.all([fetchSlots(selectedLot.id), fetchLots()]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate slots.');
    } finally {
      setSavingBulk(false);
    }
  };

  const lotFloors = selectedLot ? sortFloors(selectedLot.floors) : [];
  const setLotField = (name, value) => setLotForm(prev => ({ ...prev, [name]: value }));
  const fieldLabel = { display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.3rem' };

  return (
    <AppLayout>
      <div className="page-header-row">
        <div className="page-title-box">
          <h1>Parking Lots & Slots Management</h1>
        </div>
        <button className="btn-select-slot" style={{ marginTop: 0, width: 'auto', padding: '0.6rem 1.1rem' }} onClick={() => setLotForm({ ...blankLot })}>
          <i className="fa-solid fa-plus"></i> New Parking Lot
        </button>
      </div>

      {lotForm && (
        <form onSubmit={handleSaveLot} className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>{lotForm.id ? 'Edit Parking Lot' : 'Create Parking Lot'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div><label style={fieldLabel}>Lot Name *</label>
              <input className="search-input" style={{ width: '100%' }} value={lotForm.name} onChange={(e) => setLotField('name', e.target.value)} required /></div>
            <div><label style={fieldLabel}>Address *</label>
              <input className="search-input" style={{ width: '100%' }} value={lotForm.address} onChange={(e) => setLotField('address', e.target.value)} required /></div>
            <div><label style={fieldLabel}>Contact Phone</label>
              <input className="search-input" style={{ width: '100%' }} value={lotForm.contact_phone} onChange={(e) => setLotField('contact_phone', e.target.value)} /></div>
            <div><label style={fieldLabel}>Opens</label>
              <input type="time" className="search-input" style={{ width: '100%' }} value={lotForm.opening_time} onChange={(e) => setLotField('opening_time', e.target.value)} /></div>
            <div><label style={fieldLabel}>Closes</label>
              <input type="time" className="search-input" style={{ width: '100%' }} value={lotForm.closing_time} onChange={(e) => setLotField('closing_time', e.target.value)} /></div>
            <div><label style={fieldLabel}>Default Price / hr (₹)</label>
              <input type="number" min="0" step="0.01" className="search-input" style={{ width: '100%' }} value={lotForm.default_hourly_price} onChange={(e) => setLotField('default_hourly_price', e.target.value)} /></div>
            <div><label style={fieldLabel}>Pre-booking Fee (₹, blank = platform default)</label>
              <input type="number" min="0" step="0.01" className="search-input" style={{ width: '100%' }} value={lotForm.pre_booking_fee} onChange={(e) => setLotField('pre_booking_fee', e.target.value)} /></div>
            <div><label style={fieldLabel}>Latitude</label>
              <input type="number" step="any" className="search-input" style={{ width: '100%' }} value={lotForm.latitude} onChange={(e) => setLotField('latitude', e.target.value)} /></div>
            <div><label style={fieldLabel}>Longitude</label>
              <input type="number" step="any" className="search-input" style={{ width: '100%' }} value={lotForm.longitude} onChange={(e) => setLotField('longitude', e.target.value)} /></div>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={fieldLabel}>Description</label>
            <textarea className="search-input" style={{ width: '100%', minHeight: '60px' }} value={lotForm.description} onChange={(e) => setLotField('description', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            <label><input type="checkbox" checked={lotForm.four_wheeler} onChange={(e) => setLotField('four_wheeler', e.target.checked)} /> Cars / four wheelers</label>
            <label><input type="checkbox" checked={lotForm.two_wheeler} onChange={(e) => setLotField('two_wheeler', e.target.checked)} /> Bikes / two wheelers</label>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button type="submit" className="btn-select-slot" style={{ marginTop: 0, width: 'auto', padding: '0.6rem 1.25rem' }} disabled={savingLot}>
              {savingLot ? 'Saving...' : lotForm.id ? 'Save Changes' : 'Create Lot'}
            </button>
            <button type="button" className="change-btn" onClick={() => setLotForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      {!loading && lots.length === 0 && !lotForm && (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>Set up your first parking lot</h3>
          <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)' }}>
            Add your lot's details, generate its slots, then create security accounts. Drivers will see it as soon as it is live.
          </p>
          <button className="btn-select-slot" style={{ marginTop: 0, width: 'auto', padding: '0.6rem 1.25rem' }} onClick={() => setLotForm({ ...blankLot })}>
            <i className="fa-solid fa-plus"></i> Create Parking Lot
          </button>
        </div>
      )}

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
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                {lot.name}
                {!lot.is_active && <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', color: 'var(--status-occupied)' }}>HIDDEN</span>}
              </div>
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

          {selectedLot && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              <button className="change-btn" onClick={() => openEditLot(selectedLot)}><i className="fa-solid fa-pen"></i> Edit Lot Details</button>
              <button className="change-btn" onClick={handleToggleLotActive}>
                {selectedLot.is_active ? 'Hide from drivers' : 'Make live'}
              </button>
              <button className="change-btn" style={{ borderColor: 'var(--status-occupied)', color: 'var(--status-occupied)' }} onClick={handleDeleteLot}>
                <i className="fa-solid fa-trash"></i> Remove Lot
              </button>
            </div>
          )}

          <form onSubmit={handleBulkAdd} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'flex-end', marginBottom: '1rem', padding: '0.85rem', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
            <div>
              <label style={fieldLabel}>Sections (comma separated)</label>
              <input className="search-input" style={{ width: '140px' }} value={bulk.sections} onChange={(e) => setBulk(prev => ({ ...prev, sections: e.target.value }))} placeholder="A,B,C" required />
            </div>
            <div>
              <label style={fieldLabel}>Slots per section</label>
              <input className="search-input" style={{ width: '110px' }} type="number" min="1" max="100" value={bulk.count_per_section} onChange={(e) => setBulk(prev => ({ ...prev, count_per_section: e.target.value }))} required />
            </div>
            <div>
              <label style={fieldLabel}>Floor</label>
              <input className="search-input" style={{ width: '90px' }} value={bulk.floor} onChange={(e) => setBulk(prev => ({ ...prev, floor: e.target.value }))} required />
            </div>
            <div>
              <label style={fieldLabel}>Price / hr (₹)</label>
              <input className="search-input" style={{ width: '120px' }} type="number" min="0" step="0.01" placeholder={String(selectedLot?.default_hourly_price ?? 30)} value={bulk.hourly_price} onChange={(e) => setBulk(prev => ({ ...prev, hourly_price: e.target.value }))} />
            </div>
            <button type="submit" className="btn-select-slot" style={{ marginTop: 0, width: 'auto', padding: '0.6rem 1.1rem' }} disabled={!selectedLot || savingBulk}>
              <i className="fa-solid fa-wand-magic-sparkles"></i> {savingBulk ? 'Generating...' : 'Generate Slots'}
            </button>
          </form>

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
