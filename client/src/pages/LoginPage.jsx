import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { homeForRole } from '../components/layout/ProtectedRoute';
import AuthShell from '../components/auth/AuthShell';
import { AuthField, PasswordField, AuthError } from '../components/auth/AuthField';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const DEMO_ACCOUNTS = [
  { role: 'Driver', icon: 'fa-car-side', email: 'mehanna@spms.com', password: 'user123' },
  { role: 'Lot owner', icon: 'fa-building', email: 'admin@spms.com', password: 'admin123' },
  { role: 'Gate staff', icon: 'fa-shield-halved', email: 'operator@spms.com', password: 'admin123' }
];


const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    signIn(email.trim(), password);
  };

  const handleDemo = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    signIn(account.email, account.password);
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your SPMS account."
      footer={
        <>
          <span>New to SPMS? <Link to="/register">Create an account</Link></span>
          <span>Own a parking lot? <Link to="/register-owner">Register your lot</Link></span>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <AuthError message={error} />

        <AuthField
          id="login-email"
          label="Email"
          icon="fa-envelope"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(''); }}
          autoComplete="email"
          autoFocus
          required
        />
        <PasswordField
          id="login-password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(''); }}
          required
        />

        <button type="submit" className="btn btn-primary btn-block btn-lg auth-submit" disabled={loading}>
          {loading ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Signing in…</> : 'Sign in'}
        </button>
      </form>

      <div className="auth-divider"><span>or try a demo account</span></div>
      <div className="auth-demo-row">
        {DEMO_ACCOUNTS.map((acc) => (
          <button key={acc.email} type="button" className="auth-demo-chip" disabled={loading} onClick={() => handleDemo(acc)} title={acc.email}>
            <i className={`fa-solid ${acc.icon}`}></i>
            <span>{acc.role}</span>
          </button>
        ))}
      </div>
    </AuthShell>
  );
};

export default LoginPage;
