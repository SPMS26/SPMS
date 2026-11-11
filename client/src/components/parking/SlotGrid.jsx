import React from 'react';

// Display names and ordering for floor codes stored in the database
const FLOOR_LABELS = { B1: 'Basement 1', GF: 'Ground Floor', FF: 'First Floor' };
const FLOOR_ORDER = Object.keys(FLOOR_LABELS);

export const floorLabel = (key) => FLOOR_LABELS[key] || key;

export const sortFloors = (floors = []) =>
  [...floors].sort((a, b) => {
    const ia = FLOOR_ORDER.indexOf(a);
    const ib = FLOOR_ORDER.indexOf(b);
    return (ia === -1 ? FLOOR_ORDER.length : ia) - (ib === -1 ? FLOOR_ORDER.length : ib) || a.localeCompare(b);
  });

const STATUS_LABEL = { available: 'available', reserved: 'reserved', occupied: 'occupied', maintenance: 'under maintenance' };

// mySlotIds: slots held by the viewer's own bookings, drawn in the accent colour
const SlotGrid = ({ slots, floors = [], selectedSlot, activeFloor, onFloorChange, onSlotClick, mySlotIds = null }) => {
  const floorSlots = slots
    .filter((s) => s.floor === activeFloor)
    .sort((a, b) => a.slot_number.localeCompare(b.slot_number, undefined, { numeric: true }));

  return (
    <div className="slot-picker-box">
      <div className="slot-picker-top">
        <div className="floor-tabs-bar" role="tablist" aria-label="Floor" style={{ marginBottom: 0 }}>
          {sortFloors(floors).map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={activeFloor === f}
              className={`floor-btn ${activeFloor === f ? 'active' : ''}`}
              onClick={() => onFloorChange(f)}
            >
              {floorLabel(f)}
            </button>
          ))}
        </div>
        <div className="legend-bar">
          <div className="legend-item"><span className="dot available"></span> Free</div>
          <div className="legend-item"><span className="dot reserved"></span> Reserved</div>
          <div className="legend-item"><span className="dot occupied"></span> Occupied</div>
          <div className="legend-item"><span className="dot maintenance"></span> Closed</div>
          {mySlotIds && <div className="legend-item"><span className="dot mine"></span> Yours</div>}
        </div>
      </div>

      <div className="slots-matrix-wrapper">
        <div className="slots-grid-4x10">
          {floorSlots.map((slot) => {
            const isSelected = selectedSlot && selectedSlot.id === slot.id;
            const isMine = mySlotIds?.has(slot.id);
            return (
              <button
                type="button"
                key={slot.id}
                className={`slot-item status-${slot.status} ${isMine ? 'mine' : ''} ${isSelected ? 'selected-highlight' : ''}`}
                onClick={() => onSlotClick(slot)}
                aria-pressed={Boolean(isSelected)}
                aria-label={`Slot ${slot.slot_number}, ${isMine ? 'your booking' : STATUS_LABEL[slot.status] || slot.status}`}
              >
                {slot.slot_number}
              </button>
            );
          })}
          {floorSlots.length === 0 && (
            <div className="slot-details-empty" style={{ gridColumn: '1 / -1' }}>No slots on this floor.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SlotGrid;
