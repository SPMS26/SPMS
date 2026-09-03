import React, { useState } from 'react';

const AdminReserveModal = ({ isOpen, onClose, slot, onConfirmReserve }) => {
  const [driverName, setDriverName] = useState('Ramesh Kumar');
  const [vehicleNo, setVehicleNo] = useState('TS08 EQ 9988');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!driverName || !vehicleNo) return;
    onConfirmReserve(driverName, vehicleNo);
    onClose();
  };

  return (
    <div className={`modal-overlay ${isOpen ? 'active' : ''}`}>
      <div className="modal-box">
        <div className="modal-header">
          <h3>
            Admin Reserve for Driver - <span style={{ color: 'var(--accent-gold)' }}>Slot {slot ? slot.slot_number : 'C5'}</span>
          </h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              Driver Full Name:
            </label>
            <input
              type="text"
              className="search-input"
              style={{ width: '100%' }}
              placeholder="e.g. Ramesh Kumar"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              Vehicle Registration Number:
            </label>
            <input
              type="text"
              className="search-input"
              style={{ width: '100%' }}
              placeholder="e.g. TS08 EQ 9988"
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-select-slot">
            <i className="fa-solid fa-user-plus"></i> Reserve Slot & Issue Pass
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminReserveModal;
