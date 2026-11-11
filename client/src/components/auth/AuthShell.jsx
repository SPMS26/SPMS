import React from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../common/ThemeToggle';

// Shared frame for sign-in and both registration pages:
// one centred column with the logo above a dark card that holds the whole form.
const AuthShell = ({ title, subtitle, children, footer, steps, maxWidth = 460 }) => (
  <div className="auth-page auth-page--center">
    {/* Logo in the same spot as the landing page's nav bar */}
    <header className="auth-nav">
      <div className="auth-nav-inner">
        <Link to="/" className="auth-brand" aria-label="Smart Parking Management System, home">
          <span className="brand-logo-icon" aria-hidden="true"><i className="fa-solid fa-car"></i></span>
          <span className="brand-name">
            <span className="brand-full">Smart Parking Management System</span>
            <span className="brand-short" aria-hidden="true">SPMS</span>
          </span>
        </Link>
        <ThemeToggle />
      </div>
    </header>

    <main className="auth-column" style={{ maxWidth }}>
      <Link to="/" className="auth-back">
        <i className="fa-solid fa-arrow-left"></i> Back to home
      </Link>

      <div className="auth-box">
        {steps && (
          <div className="auth-steps" aria-label={`Step ${steps.current} of ${steps.labels.length}`}>
            {steps.labels.map((label, i) => (
              <div key={label} className={`auth-step ${i + 1 < steps.current ? 'done' : ''} ${i + 1 === steps.current ? 'current' : ''}`}>
                <span className="auth-step-bar"></span>
                <span className="auth-step-label">{i + 1}. {label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="auth-head">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>

        {children}

        {footer && <div className="auth-footer">{footer}</div>}
      </div>
    </main>
  </div>
);

export default AuthShell;
