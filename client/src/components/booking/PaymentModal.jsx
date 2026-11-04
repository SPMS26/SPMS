import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const PaymentModal = ({ isOpen, onClose, slot, lot, preBookingFee = 10, onSubmitPayment }) => {
  const { user, selectedVehicle } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmitPayment();
    setLoading(false);
  };

  const formattedFee = parseFloat(preBookingFee || 10).toFixed(2);
  const hourlyRate = slot ? parseFloat(slot.hourly_price || 30).toFixed(2) : '30.00';

  return (
    <div className={`modal-overlay ${isOpen ? 'active' : ''}`}>
      <div className="modal-box" style={{ maxWidth: '460px' }}>
        <div className="modal-header">
          <h3>
            Confirm Reservation & Payment
          </h3>
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
              <span className="val" style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>
                {selectedVehicle ? selectedVehicle.vehicle_number : 'TS09 AB 1234'}
              </span>
            </div>
            <div className="details-row">
              <span className="key">Assigned Slot:</span>
              <span className="val">{slot ? slot.slot_number : 'C5'} ({lot ? lot.name : 'Central Parking'})</span>
            </div>
            <div className="details-row" style={{ background: 'rgba(217, 191, 140, 0.08)', padding: '0.4rem 0.5rem', borderRadius: '6px', margin: '0.35rem 0' }}>
              <span className="key" style={{ fontWeight: 700, color: 'var(--text-main)' }}>Pre-Booking Fee:</span>
              <span className="val" style={{ color: 'var(--accent-gold)', fontWeight: 800, fontSize: '1.05rem' }}>
                ₹{formattedFee}
              </span>
            </div>
            <div className="details-row">
              <span className="key">Hourly Parking Rate:</span>
              <span className="val" style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>
                ₹{hourlyRate} / hour (Billed upon Exit)
              </span>
            </div>
            <div className="details-row">
              <span className="key">Payment Method:</span>
              <span className="val">
                Project Simulated Payment
              </span>
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', textAlign: 'center' }}>
            Reservation fee confirms your slot reservation. Your Digital QR Parking Pass will be generated instantly upon payment.
          </div>

          <button type="submit" className="btn-select-slot" disabled={loading}>
            {loading ? (
              <span><i className="fa-solid fa-circle-notch fa-spin"></i> Processing Reservation Payment...</span>
            ) : (
              <span>Pay ₹{formattedFee} Reservation Fee & Get QR Pass</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;
