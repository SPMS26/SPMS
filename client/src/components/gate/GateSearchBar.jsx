import React, { useRef } from 'react';

const GateSearchBar = ({ value, onChange, placeholder, summary, autoFocus = false }) => {
  const ref = useRef(null);
  return (
    <div className="card" style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}></i>
          <input
            ref={ref}
            className="search-input"
            style={{ width: '100%', paddingLeft: '2.5rem', fontSize: '1rem' }}
            placeholder={placeholder || 'Search vehicle number (e.g. TS09 AB 1234), ticket code or driver name'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoFocus={autoFocus}
          />
        </div>
        {value && <button className="change-btn" onClick={() => { onChange(''); ref.current?.focus(); }}>Clear</button>}
        {summary && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{summary}</span>}
      </div>
    </div>
  );
};

export default GateSearchBar;
