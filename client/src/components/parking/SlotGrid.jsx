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

const SlotGrid = ({ slots, floors = [], selectedSlot, activeFloor, onFloorChange, onSlotClick }) => {
  const floorSlots = slots
    .filter(s => s.floor === activeFloor)
    .sort((a, b) => a.slot_number.localeCompare(b.slot_number, undefined, { numeric: true }));

  return (
    <div className="slot-picker-box">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.85rem' }}>
        <div className="legend-bar">
          <div className="legend-item"><span className="dot available"></span> Available</div>
          <div className="legend-item"><span className="dot reserved"></span> Reserved</div>
          <div className="legend-item"><span className="dot occupied"></span> Occupied</div>
          <div className="legend-item"><span className="dot maintenance"></span> Maintenance</div>
        </div>
      </div>

      <div className="slots-matrix-wrapper">
        <div className="floor-tabs-bar">
          {sortFloors(floors).map(f => (
            <button
              key={f}
              className={`floor-btn ${activeFloor === f ? 'active' : ''}`}
              onClick={() => onFloorChange(f)}
            >
              {floorLabel(f)}
            </button>
          ))}
        </div>

        <div className="slots-grid-4x10">
          {floorSlots.map(slot => (
            <div
              key={slot.id}
              className={`slot-item status-${slot.status} ${selectedSlot && selectedSlot.id === slot.id ? 'selected-highlight' : ''}`}
              onClick={() => onSlotClick(slot)}
            >
              {slot.slot_number}
            </div>
          ))}
          {floorSlots.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
              No slots found on this floor.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SlotGrid;
