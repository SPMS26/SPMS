import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NotFoundPage = () => {
  const { user, isAdmin, isSecurity } = useAuth();
  const home = !user ? '/' : isSecurity ? '/admin/scanner' : isAdmin ? '/admin' : '/dashboard';

  return (
    <div className="auth-page">
      <div style={{ maxWidth: 420, textAlign: 'center' }}>
        <div className="mono" style={{ fontSize: '0.85rem', color: 'var(--ink-3)', marginBottom: '0.75rem' }}>Error 404</div>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.75rem', letterSpacing: '-0.02em' }}>Wrong turn</h1>
        <p className="muted" style={{ margin: '0 0 1.5rem' }}>There's no page at this address.</p>
        <Link to={home} className="btn btn-primary">{user ? 'Back to the app' : 'Back to home'}</Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
