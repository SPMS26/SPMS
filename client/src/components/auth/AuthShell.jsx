import React from 'react';
import { Link } from 'react-router-dom';

// Shared frame for login and both registration pages so the whole flow looks the same
const AuthShell = ({ title, subtitle, maxWidth = 440, children, footer }) => (
  <div className="auth-page">
    <div style={{ width: '100%', maxWidth }}>
      <Link to="/" className="auth-back">
        <i className="fa-solid fa-arrow-left"></i> Back to home
      </Link>
      <div className="auth-card">
        <div className="auth-head">
          <span className="brand-logo-icon" aria-hidden="true">P</span>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {children}
        {footer && <div className="auth-footer">{footer}</div>}
      </div>
    </div>
  </div>
);

export default AuthShell;
