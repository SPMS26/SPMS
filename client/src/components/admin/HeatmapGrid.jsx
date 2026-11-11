import React from 'react';

const HeatmapGrid = ({ times, days, matrix }) => {
  const hasData = Array.isArray(times) && times.length > 0 &&
                  Array.isArray(days) && days.length > 0 &&
                  Array.isArray(matrix) && matrix.length > 0;

  if (!hasData) {
    return (
      <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <i className="fa-regular fa-clock" style={{ display: 'block', fontSize: '1.5rem', marginBottom: '0.5rem', opacity: 0.5 }}></i>
        No analytics data available
      </div>
    );
  }

  const getHeatColor = (level) => {
    if (!level || level === 0) return 'var(--surface-2)';
    if (level === 1) return 'var(--heat-1)';
    if (level === 2) return 'var(--heat-2)';
    if (level === 3) return 'var(--heat-3)';
    if (level === 4) return 'var(--accent)';
    return 'var(--accent)';
  };

  return (
    <div style={{ padding: '0.5rem 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '50px repeat(7, 1fr)', gap: '6px', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
        <div></div>
        {days.map(d => <div key={d} style={{ fontWeight: 600 }}>{d}</div>)}

        {times.map((t, rIdx) => (
          <React.Fragment key={t}>
            <div style={{ textAlign: 'right', paddingRight: '6px', alignSelf: 'center' }}>{t}</div>
            {days.map((d, cIdx) => {
              const level = matrix[rIdx][cIdx];
              return (
                <div
                  key={`${rIdx}-${cIdx}`}
                  style={{
                    height: '24px',
                    borderRadius: '4px',
                    backgroundColor: getHeatColor(level),
                    border: '1px solid var(--border-subtle)'
                  }}
                  title={`${t} ${d}: Occupancy Level ${level}`}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
        <span>Low</span>
        <div style={{ height: '8px', width: '120px', borderRadius: '4px', background: 'var(--accent)' }}></div>
        <span>High</span>
      </div>
    </div>
  );
};

export default HeatmapGrid;
