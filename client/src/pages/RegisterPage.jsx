import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { homeForRole } from '../components/layout/ProtectedRoute';
import AuthShell from '../components/auth/AuthShell';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    vehicle_number: '',
    vehicle_type: 'four_wheeler',
    vehicle_model: '',
    vehicle_color: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, loading: authLoading, register } = useAuth();
  const navigate = useNavigate();

  // Registering signs the driver in, and this also sends signed-in visitors to their own home
  useEffect(() => {
    if (!authLoading && user) navigate(homeForRole(user.role), { replace: true });
  }, [authLoading, user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(formData);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create a driver account"
      maxWidth={540}
      footer={
        <>
          <span>Already have an account? <Link to="/login">Sign in</Link></span>
          <span>Own a parking lot? <Link to="/register-owner">Register your lot</Link></span>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="auth-error" role="alert">
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 1rem' }}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-name">Full name</label>
            <input id="reg-name" type="text" name="full_name" className="auth-input" value={formData.full_name} onChange={handleChange} autoComplete="name" autoFocus required />
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-phone">Phone</label>
            <input id="reg-phone" type="tel" name="phone" className="auth-input" value={formData.phone} onChange={handleChange} autoComplete="tel" required />
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-email">Email</label>
            <input id="reg-email" type="email" name="email" className="auth-input" value={formData.email} onChange={handleChange} autoComplete="email" required />
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-password">Password</label>
            <div className="auth-pw-wrap">
              <input id="reg-password" type={showPassword ? 'text' : 'password'} name="password" minLength={6} className="auth-input" value={formData.password} onChange={handleChange} autoComplete="new-password" required />
              <button type="button" className="auth-pw-toggle" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} tabIndex={-1}>
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '0.25rem' }}>
          <div className="auth-label" style={{ color: 'var(--accent-gold)', fontSize: '0.88rem', marginBottom: '0.75rem' }}>Your vehicle</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 1rem' }}>
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-plate">Registration number</label>
              <input id="reg-plate" type="text" name="vehicle_number" className="auth-input" placeholder="TS09 AB 1234" value={formData.vehicle_number} onChange={handleChange} required />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-type">Type</label>
              <select id="reg-type" name="vehicle_type" className="auth-input" value={formData.vehicle_type} onChange={handleChange}>
                <option value="four_wheeler">Car / Four wheeler</option>
                <option value="two_wheeler">Bike / Two wheeler</option>
              </select>
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-model">Model (optional)</label>
              <input id="reg-model" type="text" name="vehicle_model" className="auth-input" placeholder="Hyundai i20" value={formData.vehicle_model} onChange={handleChange} />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-color">Color (optional)</label>
              <input id="reg-color" type="text" name="vehicle_color" className="auth-input" placeholder="White" value={formData.vehicle_color} onChange={handleChange} />
            </div>
          </div>
        </div>

        <button type="submit" className="btn-select-slot auth-submit" disabled={loading}>
          {loading ? <span><i className="fa-solid fa-circle-notch fa-spin"></i> Creating account...</span> : <span>Create account</span>}
        </button>
      </form>
    </AuthShell>
  );
};

export default RegisterPage;
