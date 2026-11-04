import React from 'react';

const STATUS_SEGMENTS = [
  { key: 'occupied_slots', label: 'Occupied', color: 'var(--status-occupied)' },
  { key: 'reserved_slots', label: 'Reserved', color: 'var(--status-reserved)' },
  { key: 'maintenance_slots', label: 'Maintenance', color: 'var(--status-maintenance)' },
  { key: 'available_slots', label: 'Available', color: 'var(--status-available)' }
];

const LotMonitor = ({ lots, selectedLotId, onSelectLot }) => (
  <div className="card" style={{ marginBottom: '1.75rem' }}>
    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>
      Lot Monitoring
    </h3>

    {lots.length === 0 ? (
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>No parking lots found.</div>
    ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {lots.map(lot => {
          const total = lot.total_slots || 0;
          const inUse = total - lot.available_slots;
          const occupancyPct = total > 0 ? Math.round((inUse / total) * 100) : 0;
          const isSelected = lot.id === selectedLotId;

          return (
            <div
              key={lot.id}
              onClick={() => onSelectLot(lot)}
              style={{
                padding: '1rem',
                borderRadius: '10px',
                cursor: 'pointer',
                background: isSelected ? 'var(--accent-gold-bg)' : 'var(--bg-input)',
                border: isSelected ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
                <strong>{lot.name}</strong>
                <span style={{ fontWeight: 800, color: occupancyPct >= 90 ? 'var(--status-occupied)' : 'var(--text-main)' }}>{occupancyPct}%</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{lot.address}</div>

              <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', background: 'var(--border-subtle)' }}>
                {total > 0 && STATUS_SEGMENTS.map(seg => (
                  <div key={seg.key} title={`${seg.label}: ${lot[seg.key]}`} style={{ width: `${(lot[seg.key] / total) * 100}%`, background: seg.color }} />
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 0.75rem', marginTop: '0.75rem', fontSize: '0.75rem' }}>
                {STATUS_SEGMENTS.map(seg => (
                  <div key={seg.key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: seg.color, marginRight: 6 }}></span>
                      {seg.label}
                    </span>
                    <strong>{lot[seg.key]}</strong>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

export default LotMonitor;
