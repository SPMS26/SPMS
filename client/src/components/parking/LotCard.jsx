import React from 'react';

export const lotIconClass = () => 'fa-square-parking';

// Real slot prices, which is what gets billed. A lot can price its slots differently.
export const lotPriceLabel = (lot) => {
  if (lot.min_hourly_price === null || lot.min_hourly_price === undefined) return 'No slots yet';
  const min = Number(lot.min_hourly_price);
  const max = Number(lot.max_hourly_price);
  return min === max ? `₹${min}/hr` : `₹${min}–${max}/hr`;
};

export const lotHoursLabel = (lot) => {
  if (!lot.opening_time) return null;
  const open = String(lot.opening_time).slice(0, 5);
  const close = String(lot.closing_time || '').slice(0, 5);
  return open === '00:00' && close === '23:59' ? 'Open 24h' : `${open}–${close}`;
};

// How full the lot is decides the label and the meter colour
const availability = (lot) => {
  const total = Number(lot.total_slots) || 0;
  const free = Number(lot.available_slots) || 0;
  if (total === 0 || free === 0) return { label: 'Full', badge: 'badge-danger', meter: 'full', share: 0 };
  const share = free / total;
  if (share < 0.2) return { label: 'Filling up', badge: 'badge-warn', meter: 'tight', share };
  return { label: 'Spaces free', badge: 'badge-ok', meter: '', share };
};

const LotCard = ({ lot, selected, onSelect }) => {
  const state = availability(lot);
  const hours = lotHoursLabel(lot);

  return (
    <button
      type="button"
      className={`lot-summary-card ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(lot)}
      aria-pressed={selected}
    >
      <div className="lot-card-head">
        <h3 className="lot-card-title">{lot.name}</h3>
        <span className={`badge ${state.badge}`}>{state.label}</span>
      </div>
      <div className="lot-card-sub">{lot.address || 'Location not set'}</div>
      {(lot.owner_name || hours) && (
        <div className="lot-card-sub">{[lot.owner_name, hours].filter(Boolean).join(' · ')}</div>
      )}

      <div className="lot-card-stats">
        <div className="lot-card-free">
          {lot.available_slots ?? 0} <small>of {lot.total_slots ?? 0} free</small>
        </div>
        <div className="lot-card-price">{lotPriceLabel(lot)}</div>
      </div>
      <div className={`lot-meter ${state.meter}`} aria-hidden="true">
        <span style={{ width: `${Math.round(state.share * 100)}%` }} />
      </div>
    </button>
  );
};

export default LotCard;
