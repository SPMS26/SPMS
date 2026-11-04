import React from 'react';
import { Link } from 'react-router-dom';

// Shared frame for login and both registration pages so the whole flow looks the same
const AuthShell = ({ icon = 'fa-square-parking', title, subtitle, maxWidth = 460, children, footer }) => (
  <div className="auth-page">
    <div style={{ width: '100%', maxWidth }}>
      <Link to="/" className="auth-back">
        Back to home
      </Link>
      <div className="auth-card">
        <div className="auth-head">
          <div className="brand-logo-icon">
            <i className={`fa-solid ${icon}`}></i>
          </div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {children}
      </div>
      {footer && <div className="auth-footer">{footer}</div>}
    </div>
  </div>
);

export default AuthShell;
