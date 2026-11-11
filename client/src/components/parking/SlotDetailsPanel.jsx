import React from 'react';
import { floorLabel } from './SlotGrid';

const STATUS = {
  available: { label: 'Free', badge: 'badge-ok' },
  reserved: { label: 'Reserved', badge: 'badge-warn' },
  occupied: { label: 'Occupied', badge: 'badge-busy' },
  maintenance: { label: 'Closed', badge: 'badge-maintenance' }
};

const UNAVAILABLE_NOTE = {
  reserved: 'Someone has reserved this slot.',
  occupied: 'A vehicle is parked here.',
  maintenance: 'This slot is closed for maintenance.'
};

// myBooking: the viewer's own cancellable booking on this slot, if any (user view only)
const SlotDetailsPanel = ({ selectedSlot, activeFloor, onConfirmSelect, isAdmin = false, onAdminAction, myBooking = null, onCancelBooking }) => {
  if (!selectedSlot) {
    return (
      <div className="slot-details-panel">
        <div className="slot-details-empty">Pick a slot on the map to see its details.</div>
      </div>
    );
  }

  const { status } = selectedSlot;
  const meta = myBooking ? { label: 'Your booking', badge: 'badge-accent' } : STATUS[status] || { label: status, badge: '' };
  const isOccupied = status === 'occupied';

  return (
    <div className="slot-details-panel">
      <div className="slot-details-head">
        <h3 className="slot-details-code">
          <small>Slot</small>
          {selectedSlot.slot_number}
        </h3>
        <span className={`badge ${meta.badge}`}>{meta.label}</span>
      </div>

      <div className="details-row">
        <span className="key">Floor</span>
        <span className="val">{floorLabel(selectedSlot.floor || activeFloor)}</span>
      </div>
      <div className="details-row">
        <span className="key">Type</span>
        <span className="val" style={{ textTransform: 'capitalize' }}>{selectedSlot.slot_type}</span>
      </div>
      <div className="details-row">
        <span className="key">Rate</span>
        <span className="val mono">₹{selectedSlot.hourly_price}/hr</span>
      </div>

      {isAdmin ? (
        <div style={{ marginTop: '1.25rem' }}>
          <button
            className="btn btn-block"
            disabled={isOccupied}
            onClick={() => onAdminAction('maintenance')}
            title={isOccupied ? 'A vehicle is parked here' : undefined}
          >
            <i className="fa-solid fa-wrench"></i> Close for maintenance
          </button>
          <button
            className="btn btn-primary btn-block"
            disabled={isOccupied}
            onClick={() => onAdminAction('available')}
            title={isOccupied ? 'A vehicle is parked here' : undefined}
          >
            <i className="fa-solid fa-check"></i> Mark as free
          </button>
        </div>
      ) : myBooking ? (
        <>
          <div className="slot-details-note"><i className="fa-solid fa-circle-check"></i> You have booked this slot</div>
          <button type="button" className="btn btn-danger-outline btn-block" style={{ marginTop: '0.75rem' }} onClick={() => onCancelBooking(myBooking)}>
            Cancel booking
          </button>
        </>
      ) : status === 'available' ? (
        <button className="btn-select-slot" onClick={onConfirmSelect}>
          Book slot {selectedSlot.slot_number}
        </button>
      ) : (
        <>
          <p className="muted" style={{ margin: '1rem 0 0', fontSize: '0.88rem' }}>{UNAVAILABLE_NOTE[status]}</p>
          <button className="btn-select-slot" disabled>Not available</button>
        </>
      )}
    </div>
  );
};

export default SlotDetailsPanel;
