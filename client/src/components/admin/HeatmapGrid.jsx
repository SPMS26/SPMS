import React from 'react';

const HeatmapGrid = () => {
  const times = ['12 AM', '4 AM', '8 AM', '12 PM', '4 PM', '8 PM'];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const matrix = [
    [0, 0, 0, 0, 0, 1, 1],
    [0, 0, 0, 0, 0, 0, 0],
    [2, 3, 3, 3, 3, 2, 1],
    [4, 4, 4, 4, 5, 5, 4],
    [3, 3, 3, 4, 4, 3, 2],
    [1, 1, 2, 2, 3, 2, 1]
  ];

  const getHeatColor = (level) => {
    switch (level) {
      case 0: return '#182032';
      case 1: return '#3b1c1c';
      case 2: return '#78350f';
      case 3: return '#b45309';
      case 4: return '#f59e0b';
      case 5: return '#10b981';
      default: return '#182032';
    }
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
        <div style={{ height: '8px', width: '120px', borderRadius: '4px', background: 'linear-gradient(90deg, #182032, #78350f, #b45309, #f59e0b, #10b981)' }}></div>
        <span>High</span>
      </div>
    </div>
  );
};

export default HeatmapGrid;
