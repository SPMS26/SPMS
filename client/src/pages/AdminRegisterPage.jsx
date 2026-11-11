import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import AuthShell from '../components/auth/AuthShell';
import { AuthField, PasswordField, AuthError } from '../components/auth/AuthField';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;


const PAYMENT_METHODS = [
  { value: 'simulated_card', label: 'Card', icon: 'fa-credit-card' },
  { value: 'simulated_upi', label: 'UPI', icon: 'fa-mobile-screen' },
  { value: 'simulated_netbanking', label: 'Net banking', icon: 'fa-building-columns' }
];

const AdminRegisterPage = () => {
  const [formData, setFormData] = useState({ full_name: '', email: '', password: '', phone: '', organization_name: '' });
  const [fee, setFee] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('simulated_card');
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const { loginWithSession } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    authService.getAdminRegistrationConfig().then((res) => setFee(res.fee)).catch(() => setFee(999));
  }, []);

  const step = receipt ? 3 : registration ? 2 : 1;
  const amount = Number(registration?.fee_amount ?? fee ?? 0).toFixed(2);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.organization_name.trim() || !formData.full_name.trim()) {
      setError('Please enter your organisation and your name.');
      return;
    }
    if (!EMAIL_REGEX.test(formData.email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    setLoading(true);
    try {
      const res = await authService.registerAdmin({ ...formData, email: formData.email.trim() });
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
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  const titles = {
    1: ['Register your parking lot', fee !== null ? `A one-time registration fee of ₹${Number(fee).toFixed(2)} activates your owner account.` : 'Create your lot owner account.'],
    2: ['Pay the registration fee', 'Your owner account is created as soon as the payment goes through.'],
    3: ['You\'re all set', 'Your owner account is active. Next, add your first lot.']
  };

  return (
    <AuthShell
      title={titles[step][0]}
      subtitle={titles[step][1]}
      maxWidth={480}
      steps={{ current: step, labels: ['Your details', 'Payment', 'Done'] }}
      footer={step === 1 && (
        <>
          <span>Already registered? <Link to="/login">Sign in</Link></span>
          <span>Just need to park? <Link to="/register">Create a driver account</Link></span>
        </>
      )}
    >
      <AuthError message={error} />

      {step === 1 && (
        <form onSubmit={handleSubmit} noValidate>
          <AuthField id="own-org" label="Organisation or business name" icon="fa-building" name="organization_name" value={formData.organization_name} onChange={handleChange} autoComplete="organization" autoFocus required />
          <div className="auth-grid-2">
            <AuthField id="own-name" label="Your name" icon="fa-user" name="full_name" value={formData.full_name} onChange={handleChange} autoComplete="name" required />
            <AuthField id="own-phone" label="Phone" icon="fa-phone" type="tel" name="phone" value={formData.phone} onChange={handleChange} autoComplete="tel" required />
          </div>
          <AuthField id="own-email" label="Work email" icon="fa-envelope" type="email" name="email" placeholder="you@company.com" value={formData.email} onChange={handleChange} autoComplete="email" required />
          <PasswordField id="own-password" name="password" value={formData.password} onChange={handleChange} isNew required />

          <button type="submit" className="btn btn-primary btn-block btn-lg auth-submit" disabled={loading}>
            {loading ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Saving…</> : <>Continue to payment <i className="fa-solid fa-arrow-right"></i></>}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handlePay}>
          <div className="auth-summary">
            <div className="details-row"><span className="key">Organisation</span><span className="val">{registration.organization_name}</span></div>
            <div className="details-row"><span className="key">Owner</span><span className="val">{registration.full_name}</span></div>
            <div className="details-row auth-summary-total"><span className="key">Registration fee</span><span className="val mono">₹{amount}</span></div>
          </div>

          <div className="auth-field">
            <span className="auth-label">Pay with</span>
            <div className="auth-choice-row auth-choice-row--3" role="radiogroup" aria-label="Payment method">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={paymentMethod === m.value}
                  className={`auth-choice ${paymentMethod === m.value ? 'active' : ''}`}
                  onClick={() => setPaymentMethod(m.value)}
                >
                  <i className={`fa-solid ${m.icon}`}></i>
                  <strong>{m.label}</strong>
                </button>
              ))}
            </div>
          </div>

          <p className="auth-hint" style={{ margin: '0 0 1rem' }}>
            <i className="fa-solid fa-circle-info"></i> This is a simulated payment. No real money is charged.
          </p>

          <div className="auth-actions">
            <button type="button" className="btn btn-lg" onClick={() => { setRegistration(null); setError(''); }} disabled={paying}>
              <i className="fa-solid fa-arrow-left"></i> Edit details
            </button>
            <button type="submit" className="btn btn-primary btn-lg" disabled={paying}>
              {paying ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Processing…</> : <><i className="fa-solid fa-lock"></i> Pay ₹{amount}</>}
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div>
          <div className="auth-success">
            <span className="auth-success-icon"><i className="fa-solid fa-check"></i></span>
            <div>
              <strong>Payment received</strong>
              <span>A receipt is below for your records.</span>
            </div>
          </div>
          <div className="auth-summary">
            <div className="details-row"><span className="key">Organisation</span><span className="val">{receipt.organization_name}</span></div>
            <div className="details-row"><span className="key">Amount paid</span><span className="val mono">₹{Number(receipt.amount).toFixed(2)}</span></div>
            <div className="details-row"><span className="key">Reference</span><span className="val mono">{receipt.transaction_reference}</span></div>
          </div>
          <button className="btn btn-primary btn-block btn-lg auth-submit" onClick={() => navigate('/admin/lots', { replace: true })}>
            Set up your first lot <i className="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      )}
    </AuthShell>
  );
};

export default AdminRegisterPage;
