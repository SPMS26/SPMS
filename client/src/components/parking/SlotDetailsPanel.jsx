import React from 'react';
import { floorLabel } from './SlotGrid';

const SlotDetailsPanel = ({ selectedSlot, activeFloor, onConfirmSelect, isAdmin = false, onAdminAction }) => {
  if (!selectedSlot) {
    return (
      <div className="slot-details-panel">
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>Select a slot to see its details.</div>
      </div>
    );
  }

  const slotCode = selectedSlot.slot_number;
  const status = selectedSlot.status;
  const price = selectedSlot.hourly_price;

  const getBadgeStyle = (st) => {
    if (st === 'available') return { bg: 'var(--status-available-bg)', color: 'var(--status-available)', border: '1px solid var(--status-available-border)' };
    if (st === 'reserved') return { bg: 'var(--status-reserved-bg)', color: 'var(--status-reserved)', border: '1px solid var(--status-reserved-border)' };
    if (st === 'maintenance') return { bg: 'var(--status-maintenance-bg)', color: 'var(--status-maintenance)', border: '1px solid var(--border-subtle)' };
    return { bg: 'var(--status-occupied-bg)', color: 'var(--status-occupied)', border: '1px solid var(--status-occupied-border)' };
  };

  const badgeStyle = getBadgeStyle(status);

  return (
    <div className="slot-details-panel">
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Slot {slotCode}</h3>
          <span
            style={{
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'capitalize',
              ...badgeStyle
            }}
          >
            {status}
          </span>
        </div>

        <div className="details-row">
          <span className="key">Location</span>
          <span className="val">{floorLabel(selectedSlot.floor || activeFloor)}</span>
        </div>
        <div className="details-row">
          <span className="key">Type</span>
          <span className="val" style={{ textTransform: 'capitalize' }}>{selectedSlot.slot_type}</span>
        </div>
        <div className="details-row">
          <span className="key">Price</span>
          <span className="val" style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>₹{price} / hour</span>
        </div>
      </div>

      {!isAdmin ? (
        <button
          className="btn-select-slot"
          disabled={status !== 'available'}
          onClick={onConfirmSelect}
          style={{ opacity: status === 'available' ? 1 : 0.5 }}
        >
          {status === 'available' ? `Select Slot ${slotCode}` : `Slot ${status.toUpperCase()}`}
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1.25rem' }}>
          <button
            className="btn-select-slot"
            style={{ color: '#fff', background: 'linear-gradient(135deg, #4b5563, #374151)', boxShadow: 'none', marginTop: 0 }}
            onClick={() => onAdminAction('maintenance')}
          >
            <i className="fa-solid fa-wrench"></i> Mark as Maintenance
          </button>
          <button
            className="btn-select-slot"
            style={{ background: 'linear-gradient(135deg, var(--accent-emerald), #8F7AD9)', boxShadow: 'none', marginTop: 0 }}
            onClick={() => onAdminAction('available')}
          >
            <i className="fa-solid fa-circle-check"></i> Set Available
          </button>
          <button
            className="btn-select-slot"
            style={{ marginTop: 0 }}
            onClick={() => onAdminAction('reserve_override')}
          >
            <i className="fa-solid fa-user-plus"></i> Reserve for Driver (Override)
          </button>
        </div>
      )}
    </div>
  );
};

export default SlotDetailsPanel;
