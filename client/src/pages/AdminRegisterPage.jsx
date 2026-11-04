import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import AuthShell from '../components/auth/AuthShell';

const AdminRegisterPage = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    organization_name: ''
  });
  const [fee, setFee] = useState(999);
  const [registration, setRegistration] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('simulated_card');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const { loginWithSession } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    authService.getAdminRegistrationConfig()
      .then((res) => setFee(res.fee))
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authService.registerAdmin(formData);
      setRegistration(res.registration);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start registration.');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    setError('');
    setPaying(true);
    try {
      // Simulated gateway: short delay so the processing state is visible
      await new Promise((resolve) => setTimeout(resolve, 900));
      const res = await authService.payAdminRegistration(registration.id, paymentMethod);
      loginWithSession(res.user);
      setReceipt(res.receipt);
      setRegistration(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed.');
      setRegistration(null);
    } finally {
      setPaying(false);
    }
  };

  const formattedFee = Number(registration?.fee_amount ?? fee).toFixed(2);

  return (
    <AuthShell
      icon="fa-building-shield"
      title="Register your parking lot"
      subtitle={`One-time registration fee: ₹${Number(fee).toFixed(2)}`}
      maxWidth={540}
      footer={!receipt && (
        <>
          <span>Already registered? <Link to="/login">Sign in</Link></span>
          <span>Just need to park? <Link to="/register">Create a user account</Link></span>
        </>
      )}
    >
      {receipt ? (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--accent-emerald)', fontWeight: 700 }}>
            <i className="fa-solid fa-circle-check"></i> Payment successful
          </div>
          <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
            <div className="details-row"><span className="key">Organization:</span><span className="val">{receipt.organization_name}</span></div>
            <div className="details-row"><span className="key">Amount paid:</span><span className="val" style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>₹{Number(receipt.amount).toFixed(2)}</span></div>
            <div className="details-row"><span className="key">Reference:</span><span className="val">{receipt.transaction_reference}</span></div>
          </div>
          <button className="btn-select-slot auth-submit" onClick={() => navigate('/admin/lots', { replace: true })}>
            <span>Set up your first lot</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="auth-error" role="alert">
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>{error}</span>
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label" htmlFor="own-org">Organization / business name</label>
            <input id="own-org" type="text" name="organization_name" className="auth-input" value={formData.organization_name} onChange={handleChange} autoFocus required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 1rem' }}>
            <div className="auth-field">
              <label className="auth-label" htmlFor="own-name">Owner name</label>
              <input id="own-name" type="text" name="full_name" className="auth-input" value={formData.full_name} onChange={handleChange} autoComplete="name" required />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="own-phone">Phone</label>
              <input id="own-phone" type="tel" name="phone" className="auth-input" value={formData.phone} onChange={handleChange} autoComplete="tel" required />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="own-email">Email</label>
              <input id="own-email" type="email" name="email" className="auth-input" value={formData.email} onChange={handleChange} autoComplete="email" required />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="own-password">Password</label>
              <div className="auth-pw-wrap">
                <input id="own-password" type={showPassword ? 'text' : 'password'} name="password" minLength={6} className="auth-input" value={formData.password} onChange={handleChange} autoComplete="new-password" required />
                <button type="button" className="auth-pw-toggle" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} tabIndex={-1}>
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>
          </div>
          <button type="submit" className="btn-select-slot auth-submit" disabled={loading}>
            {loading ? <span><i className="fa-solid fa-circle-notch fa-spin"></i> Saving details...</span> : <span>Continue to payment (₹{Number(fee).toFixed(2)})</span>}
          </button>
        </form>
      )}

      {registration && (
        <div className="modal-overlay active">
          <div className="modal-box" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h3>
                <i className="fa-solid fa-credit-card" style={{ color: 'var(--accent-gold)', marginRight: '0.4rem' }}></i>
                Registration fee payment
              </h3>
              <button className="modal-close" onClick={() => !paying && setRegistration(null)}>&times;</button>
            </div>

            <form onSubmit={handlePay}>
              <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
                <div className="details-row"><span className="key">Owner:</span><span className="val">{registration.full_name}</span></div>
                <div className="details-row"><span className="key">Organization:</span><span className="val">{registration.organization_name}</span></div>
                <div className="details-row" style={{ background: 'rgba(217, 191, 140, 0.08)', padding: '0.4rem 0.5rem', borderRadius: '6px', margin: '0.35rem 0' }}>
                  <span className="key" style={{ fontWeight: 700, color: 'var(--text-main)' }}>Registration fee:</span>
                  <span className="val" style={{ color: 'var(--accent-gold)', fontWeight: 800, fontSize: '1.05rem' }}>₹{formattedFee}</span>
                </div>
                <div className="details-row">
                  <span className="key">Payment method:</span>
                  <span className="val">
                    <select className="auth-input" style={{ padding: '0.45rem 0.6rem' }} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                      <option value="simulated_card">Card (simulated)</option>
                      <option value="simulated_upi">UPI (simulated)</option>
                      <option value="simulated_netbanking">Net banking (simulated)</option>
                    </select>
                  </span>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', textAlign: 'center' }}>
                Simulated payment: no real money is charged. Your owner account is created once payment succeeds.
              </div>

              <button type="submit" className="btn-select-slot" disabled={paying}>
                {paying ? (
                  <span><i className="fa-solid fa-circle-notch fa-spin"></i> Processing payment...</span>
                ) : (
                  <span><i className="fa-solid fa-lock"></i> Pay ₹{formattedFee} and activate</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </AuthShell>
  );
};

export default AdminRegisterPage;
