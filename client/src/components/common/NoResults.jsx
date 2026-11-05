import React from 'react';

const NoResults = ({ query, onClear }) => (
  <div style={{ width: '100%', textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
    <i className="fa-solid fa-magnifying-glass" style={{ display: 'block', fontSize: '1.5rem', marginBottom: '0.75rem', opacity: 0.5 }}></i>
    <p style={{ margin: '0 0 0.85rem', overflowWrap: 'anywhere' }}>
      No results for <strong style={{ color: 'var(--text-main)' }}>{query.trim()}</strong>
    </p>
    <button type="button" className="change-btn" onClick={onClear}>Clear search</button>
  </div>
);

export default NoResults;
