import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

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
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await register(formData);
      toast.success('Registration successful!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', padding: '1.5rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: '520px', marginBottom: '1rem', display: 'flex', justifyContent: 'flex-start' }}>
        <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
          <i className="fa-solid fa-arrow-left"></i> Back to SPMS Landing Page
        </Link>
      </div>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div className="brand-logo-icon" style={{ margin: '0 auto 0.75rem auto', width: '44px', height: '44px', fontSize: '1.4rem' }}>
              <i className="fa-solid fa-square-parking"></i>
            </div>
          </Link>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>Driver Registration</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Register to search and book parking slots</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Full Name:</label>
              <input type="text" name="full_name" className="search-input" style={{ width: '100%' }} value={formData.full_name} onChange={handleChange} required />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Phone Number:</label>
              <input type="text" name="phone" className="search-input" style={{ width: '100%' }} value={formData.phone} onChange={handleChange} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Email Address:</label>
              <input type="email" name="email" className="search-input" style={{ width: '100%' }} value={formData.email} onChange={handleChange} required />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Password:</label>
              <input type="password" name="password" className="search-input" style={{ width: '100%' }} value={formData.password} onChange={handleChange} required />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '1rem', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.9rem', margin: '0 0 0.75rem 0', color: 'var(--accent-gold)' }}>Vehicle Details</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Vehicle Reg Number:</label>
                <input type="text" name="vehicle_number" className="search-input" style={{ width: '100%' }} placeholder="e.g. TS09 AB 1234" value={formData.vehicle_number} onChange={handleChange} required />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Vehicle Type:</label>
                <select name="vehicle_type" className="search-input" style={{ width: '100%' }} value={formData.vehicle_type} onChange={handleChange}>
                  <option value="four_wheeler">Car / Four Wheeler</option>
                  <option value="two_wheeler">Bike / Two Wheeler</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Model:</label>
                <input type="text" name="vehicle_model" className="search-input" style={{ width: '100%' }} placeholder="e.g. Hyundai i20" value={formData.vehicle_model} onChange={handleChange} />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Color:</label>
                <input type="text" name="vehicle_color" className="search-input" style={{ width: '100%' }} placeholder="e.g. White" value={formData.vehicle_color} onChange={handleChange} />
              </div>
            </div>
          </div>

          <button type="submit" className="btn-select-slot" style={{ marginTop: '0.5rem' }} disabled={loading}>
            {loading ? 'Creating Account...' : 'Register Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--accent-gold)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
