import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { homeForRole } from '../components/layout/ProtectedRoute';
import AuthShell from '../components/auth/AuthShell';

const DEMO_ACCOUNTS = [
  { role: 'Driver', email: 'mehanna@spms.com', password: 'user123' },
  { role: 'Lot Owner', email: 'admin@spms.com', password: 'admin123' },
  { role: 'Gate Security', email: 'operator@spms.com', password: 'admin123' }
];

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Where to go once signed in: the page the visitor was sent here from, else their own home.
  // Pages that a role cannot open bounce to that role's home on their own (ProtectedRoute).
  const from = location.state?.from?.pathname;

  // Single place that redirects, so it also covers signed-in users who open /login directly
  useEffect(() => {
    if (!authLoading && user) {
      navigate(from && from !== '/login' ? from : homeForRole(user.role), { replace: true });
    }
  }, [authLoading, user]);

  const signIn = async (emailValue, passwordValue) => {
    setError('');
    setLoading(true);
    try {
      await login(emailValue, passwordValue);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    signIn(email.trim(), password);
  };

  const handleDemo = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    signIn(account.email, account.password);
  };

  return (
    <AuthShell
      title="Sign in"
      footer={
        <>
          <span>New driver? <Link to="/register">Create an account</Link></span>
          <span>Own a parking lot? <Link to="/register-owner">Register your lot</Link></span>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate={false}>
        {error && (
          <div className="auth-error" role="alert">
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>{error}</span>
          </div>
        )}

        <div className="auth-field">
          <label className="auth-label" htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            className="auth-input"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            autoComplete="email"
            autoFocus
            required
          />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="login-password">Password</label>
          <div className="auth-pw-wrap">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="auth-input"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="auth-pw-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>
        </div>

        <button type="submit" className="btn-select-slot auth-submit" disabled={loading}>
          {loading ? (
            <span><i className="fa-solid fa-circle-notch fa-spin"></i> Signing in...</span>
          ) : (
            <span>Sign in</span>
          )}
        </button>
      </form>

      <div className="auth-demo">
        <button type="button" className="auth-demo-toggle" onClick={() => setDemoOpen((v) => !v)} aria-expanded={demoOpen}>
          <span><i className="fa-solid fa-key" style={{ color: 'var(--accent-gold)', marginRight: '0.4rem' }}></i> Try a demo account</span>
          <i className={`fa-solid ${demoOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
        </button>
        {demoOpen && (
          <div className="auth-demo-list">
            {DEMO_ACCOUNTS.map((acc) => (
              <button key={acc.email} type="button" className="auth-demo-item" disabled={loading} onClick={() => handleDemo(acc)}>
                <span>
                  <div className="role">{acc.role}</div>
                  <div className="email">{acc.email}</div>
                </span>
                <span className="go">Sign in <i className="fa-solid fa-arrow-right"></i></span>
              </button>
            ))}
          </div>
        )}
      </div>
    </AuthShell>
  );
};

export default LoginPage;
