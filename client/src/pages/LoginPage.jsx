import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const DEMO_ACCOUNTS = [
  {
    role: 'ADMIN',
    name: 'Super Admin',
    email: 'admin@spms.com',
    password: 'admin123',
    badgeColor: '#10b981',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    icon: 'fa-shield-halved',
    note: 'Admin Dashboard'
  },
  {
    role: 'ADMIN',
    name: 'Security Operator',
    email: 'operator@spms.com',
    password: 'admin123',
    badgeColor: '#10b981',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    icon: 'fa-user-shield',
    note: 'Gate & Scanner'
  },
  {
    role: 'USER',
    name: 'Mehanna Reddy',
    email: 'mehanna@spms.com',
    password: 'user123',
    badgeColor: '#f59e0b',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    icon: 'fa-car-side',
    note: 'Slot C5 Reserved (QR)'
  },
  {
    role: 'USER',
    name: 'Aditya Sharma',
    email: 'aditya@spms.com',
    password: 'user123',
    badgeColor: '#f59e0b',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    icon: 'fa-car',
    note: 'Slot B8 Parked'
  },
  {
    role: 'USER',
    name: 'Priya Patel',
    email: 'priya@spms.com',
    password: 'user123',
    badgeColor: '#38bdf8',
    badgeBg: 'rgba(56, 189, 248, 0.15)',
    icon: 'fa-bolt',
    note: 'EV Driver / Past'
  }
];

const LoginPage = () => {
  const [email, setEmail] = useState('mehanna@spms.com');
  const [password, setPassword] = useState('user123');
  const [activeDemo, setActiveDemo] = useState('mehanna@spms.com');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await login(email, password);
      toast.success(`Welcome back, ${res.user.full_name}!`);
      if (res.user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemo = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setActiveDemo(account.email);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', padding: '1.5rem 1rem' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: '16px', width: '100%', maxWidth: '460px', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div className="brand-logo-icon" style={{ margin: '0 auto 0.75rem auto', width: '48px', height: '48px', fontSize: '1.5rem' }}>
            <i className="fa-solid fa-square-parking"></i>
          </div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-main)' }}>Sign In to Smart Parking</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Select a demo credential below or enter your login details</p>
        </div>

        {/* Demo Credentials Quick-Select Section */}
        <div style={{ marginBottom: '1.5rem', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <i className="fa-solid fa-key" style={{ color: 'var(--accent-gold)' }}></i> Demo Accounts (1-Click Fill)
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Passwords: admin123 / user123</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.45rem' }}>
            {DEMO_ACCOUNTS.map((acc) => {
              const isSelected = activeDemo === acc.email && email === acc.email;
              return (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleSelectDemo(acc)}
                  style={{
                    background: isSelected ? 'var(--bg-card-hover)' : 'rgba(255,255,255,0.03)',
                    border: isSelected ? `1.5px solid ${acc.badgeColor}` : '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '0.45rem 0.55rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {acc.name.split(' ')[0]}
                    </span>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: '4px', background: acc.badgeBg, color: acc.badgeColor }}>
                      {acc.role}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {acc.note}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Email Address:</label>
            <input
              type="email"
              className="search-input"
              style={{ width: '100%' }}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setActiveDemo(e.target.value);
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Password:</label>
            <input
              type="password"
              className="search-input"
              style={{ width: '100%' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-select-slot" style={{ marginTop: 0 }} disabled={loading}>
            {loading ? (
              <span><i className="fa-solid fa-circle-notch fa-spin"></i> Authenticating...</span>
            ) : (
              <span><i className="fa-solid fa-arrow-right-to-bracket" style={{ marginRight: '0.4rem' }}></i> Sign In</span>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--accent-gold)', textDecoration: 'none', fontWeight: 600 }}>Register now</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
