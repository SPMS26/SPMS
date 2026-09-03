import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const PaymentModal = ({ isOpen, onClose, slot, lot, onSubmitPayment }) => {
  const { user, selectedVehicle } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmitPayment();
    setLoading(false);
  };

  return (
    <div className={`modal-overlay ${isOpen ? 'active' : ''}`}>
      <div className="modal-box">
        <div className="modal-header">
          <h3>Confirm Payment & Booking</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
            <div className="details-row">
              <span className="key">User Name:</span>
              <span className="val">{user ? user.full_name : 'Mehanna Reddy'}</span>
            </div>
            <div className="details-row">
              <span className="key">Vehicle Registration:</span>
              <span className="val" style={{ color: 'var(--accent-gold)' }}>
                {selectedVehicle ? selectedVehicle.vehicle_number : 'TS09 AB 1234'}
              </span>
            </div>
            <div className="details-row">
              <span className="key">Assigned Slot:</span>
              <span className="val">{slot ? slot.slot_number : 'C5'} ({lot ? lot.name : 'Central Parking'})</span>
            </div>
            <div className="details-row">
              <span className="key">Base Fare Amount:</span>
              <span className="val" style={{ color: 'var(--accent-emerald)', fontWeight: 800 }}>
                ₹{slot ? slot.hourly_price : 30}.00
              </span>
            </div>
            <div className="details-row">
              <span className="key">Payment Gateway:</span>
              <span className="val">
                <i className="fa-solid fa-credit-card"></i> Simulated Payment Engine
              </span>
            </div>
          </div>

          <button type="submit" className="btn-select-slot" disabled={loading}>
            {loading ? (
              <span><i className="fa-solid fa-circle-notch fa-spin"></i> Processing Payment...</span>
            ) : (
              <span><i className="fa-solid fa-lock"></i> Pay ₹{slot ? slot.hourly_price : 30} & Generate QR Code</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;
