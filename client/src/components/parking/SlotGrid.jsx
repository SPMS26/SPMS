import React from 'react';

const SlotGrid = ({ slots, selectedSlot, activeFloor, onFloorChange, onSlotClick }) => {
  const floors = [
    { key: 'B1', label: 'Basement 1', icon: 'fa-layer-group' },
    { key: 'GF', label: 'Ground Floor', icon: 'fa-layer-group' },
    { key: 'FF', label: 'First Floor', icon: 'fa-layer-group' }
  ];

  // Filter slots for active floor
  const floorSlots = slots.filter(s => s.floor === activeFloor || (!s.floor && activeFloor === 'B1'));

  // Group or layout 4x10 matrix (rows A, B, C, D)
  const rows = ['A', 'B', 'C', 'D'];

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
          {floors.map(f => (
            <button
              key={f.key}
              className={`floor-btn ${activeFloor === f.key ? 'active' : ''}`}
              onClick={() => onFloorChange(f.key)}
            >
              <i className={`fa-solid ${f.icon}`}></i> {f.label}
            </button>
          ))}
        </div>

        <div className="slots-grid-4x10">
          {rows.map(row => {
            const rowSlots = [];
            for (let i = 1; i <= 10; i++) {
              const code = `${row}${i}`;
              const slot = floorSlots.find(s => s.slot_number === code) || { slot_number: code, status: 'available' };
              const isSelected = selectedSlot && selectedSlot.slot_number === code;

              rowSlots.push(
                <div
                  key={code}
                  className={`slot-item status-${slot.status} ${isSelected ? 'selected-highlight' : ''}`}
                  onClick={() => onSlotClick(slot)}
                >
                  {code}
                </div>
              );
            }
            return rowSlots;
          })}
        </div>
      </div>
    </div>
  );
};

export default SlotGrid;
