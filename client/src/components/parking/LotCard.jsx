import React from 'react';

const LotCard = ({ lot, selected, onSelect }) => {
  const getIconClass = (name) => {
    if (name.includes('Science')) return 'fa-flask';
    if (name.includes('Library')) return 'fa-book';
    if (name.includes('Hostel')) return 'fa-bed';
    return 'fa-building-user';
  };

  const isBusy = lot.available_slots < 10;

  return (
    <div
      className={`lot-summary-card ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(lot)}
    >
      <div className="lot-img-placeholder">
        <i className={`fa-solid ${getIconClass(lot.name)}`}></i>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="lot-card-title">{lot.name}</div>
          <div className="lot-card-sub">
            <i className="fa-solid fa-location-dot"></i> {lot.address || 'Location not set'}
          </div>
          {lot.owner_name && (
            <div className="lot-card-sub">
              <i className="fa-solid fa-building"></i> {lot.owner_name}
              {lot.opening_time && ` • ${String(lot.opening_time).slice(0, 5) === '00:00' && String(lot.closing_time || '').slice(0, 5) === '23:59' ? 'Open 24h' : `${String(lot.opening_time).slice(0, 5)}-${String(lot.closing_time || '').slice(0, 5)}`}`}
            </div>
          )}
        </div>
        <span
          style={{
            background: isBusy ? 'rgba(217, 191, 140, 0.15)' : 'rgba(227, 204, 154, 0.15)',
            color: isBusy ? 'var(--status-reserved)' : 'var(--status-available)',
            fontSize: '0.68rem',
            padding: '0.15rem 0.45rem',
            borderRadius: '4px',
            fontWeight: 700
          }}
        >
          {isBusy ? 'Busy' : 'Open'}
        </span>
      </div>

      <div className="lot-card-stats">
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{lot.total_slots || 40}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Slots</div>
        </div>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--status-available)' }}>
            {lot.available_slots}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Available</div>
        </div>
        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
          ₹{Number(lot.default_hourly_price ?? 30)} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/hr</span>
        </div>
      </div>
    </div>
  );
};

export default LotCard;
