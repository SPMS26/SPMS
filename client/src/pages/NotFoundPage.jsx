import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-main)', padding: '1rem', textAlign: 'center' }}>
      <div style={{ fontSize: '4rem', color: 'var(--accent-gold)', marginBottom: '1rem' }}>
        404
      </div>
      <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2rem', marginBottom: '0.5rem' }}>Page Not Found</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>The requested page or parking resource does not exist.</p>
      <Link to="/dashboard" className="btn-select-slot" style={{ width: 'auto', padding: '0.6rem 1.5rem', textDecoration: 'none' }}>
        Return to Dashboard
      </Link>
    </div>
  );
};

export default NotFoundPage;
