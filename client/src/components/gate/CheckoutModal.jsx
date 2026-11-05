import React from 'react';

const CheckoutModal = ({ bill, confirming, onConfirm, onClose }) => {
  if (!bill) return null;
  return (
    <div className="modal-overlay active">
      <div className="modal-box" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h3><i className="fa-solid fa-receipt" style={{ color: 'var(--accent-gold)', marginRight: '0.4rem' }}></i> Checkout</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
          <div className="details-row"><span className="key">Vehicle:</span><span className="val" style={{ fontFamily: 'monospace', color: 'var(--accent-gold)', fontWeight: 700 }}>{bill.vehicle_number}</span></div>
          <div className="details-row"><span className="key">Slot:</span><span className="val">{bill.slot_number} ({bill.lot_name})</span></div>
          <div className="details-row"><span className="key">Duration:</span><span className="val">{bill.duration_minutes} min (billed {bill.duration_hours}h)</span></div>
          <div className="details-row"><span className="key">Rate:</span><span className="val">₹{Number(bill.hourly_rate).toFixed(2)} / hour</span></div>
          <div className="details-row" style={{ background: 'rgba(217, 191, 140, 0.08)', padding: '0.4rem 0.5rem', borderRadius: '6px', margin: '0.35rem 0' }}>
            <span className="key" style={{ fontWeight: 700, color: 'var(--text-main)' }}>Collect now:</span>
            <span className="val" style={{ color: 'var(--accent-gold)', fontWeight: 800, fontSize: '1.15rem' }}>₹{Number(bill.amount_due).toFixed(2)}</span>
          </div>
          {Number(bill.pre_booking_fee) > 0 && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>The ₹{Number(bill.pre_booking_fee).toFixed(2)} pre-booking fee was already paid online.</div>
          )}
        </div>
        <button className="btn-select-slot" disabled={confirming} onClick={onConfirm}>
          {confirming ? 'Confirming...' : <span><i className="fa-solid fa-circle-check"></i> Payment received - Check Out</span>}
        </button>
      </div>
    </div>
  );
};

export default CheckoutModal;
