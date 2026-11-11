import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { homeForRole } from '../components/layout/ProtectedRoute';
import AuthShell from '../components/auth/AuthShell';
import { AuthField, PasswordField, AuthError } from '../components/auth/AuthField';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;


const VEHICLE_TYPES = [
  { value: 'four_wheeler', label: 'Car', icon: 'fa-car-side', note: 'Four-wheeler' },
  { value: 'two_wheeler', label: 'Bike', icon: 'fa-motorcycle', note: 'Two-wheeler' }
];

const RegisterPage = () => {
  const [step, setStep] = useState(1);
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
  const [error, setError] = useState('');
  const { user, loading: authLoading, register } = useAuth();
  const navigate = useNavigate();

  // Registering signs the user in, and this also sends signed-in visitors to their own home
  useEffect(() => {
    if (!authLoading && user) navigate(homeForRole(user.role), { replace: true });
  }, [authLoading, user]);

  const set = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };
  const handleChange = (e) => set(e.target.name, e.target.value);

  // Step 1 is checked here so the user isn't sent back from step 2 for something fixable now
  const accountProblem = () => {
    if (!formData.full_name.trim()) return 'Please enter your name.';
    if (!EMAIL_REGEX.test(formData.email.trim())) return 'Enter a valid email address.';
    if (!formData.phone.trim()) return 'Please enter your phone number.';
    if (formData.password.length < 6) return 'Password must be at least 6 characters long.';
    return null;
  };

  const goToVehicle = (e) => {
    e.preventDefault();
    const problem = accountProblem();
    if (problem) {
      setError(problem);
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.vehicle_number.trim()) {
      setError('Enter your vehicle\'s registration number.');
      return;
    }
    setLoading(true);
    try {
      await register({ ...formData, email: formData.email.trim() });
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(message);
      // Problems with the account details are fixed on step 1
      if (/email|name|password/i.test(message)) setStep(1);
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={step === 1 ? 'Create your account' : 'Add your vehicle'}
      subtitle={step === 1 ? 'Book parking in any listed lot.' : 'We\'ll show you lots and bays that fit it. You can add more vehicles later.'}
      steps={{ current: step, labels: ['Your account', 'Your vehicle'] }}
      footer={
        <>
          <span>Already have an account? <Link to="/login">Sign in</Link></span>
          <span>Own a parking lot? <Link to="/register-owner">Register your lot</Link></span>
        </>
      }
    >
      {step === 1 ? (
        <form onSubmit={goToVehicle} noValidate>
          <AuthError message={error} />
          <AuthField id="reg-name" label="Full name" icon="fa-user" name="full_name" value={formData.full_name} onChange={handleChange} autoComplete="name" autoFocus required />
          <AuthField id="reg-email" label="Email" icon="fa-envelope" type="email" name="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} autoComplete="email" required />
          <AuthField id="reg-phone" label="Phone" icon="fa-phone" type="tel" name="phone" placeholder="+91 98765 43210" value={formData.phone} onChange={handleChange} autoComplete="tel" required />
          <PasswordField id="reg-password" name="password" value={formData.password} onChange={handleChange} isNew required />

          <button type="submit" className="btn btn-primary btn-block btn-lg auth-submit">
            Continue <i className="fa-solid fa-arrow-right"></i>
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <AuthError message={error} />

          <div className="auth-field">
            <span className="auth-label">Vehicle type</span>
            <div className="auth-choice-row" role="radiogroup" aria-label="Vehicle type">
              {VEHICLE_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={formData.vehicle_type === t.value}
                  className={`auth-choice ${formData.vehicle_type === t.value ? 'active' : ''}`}
                  onClick={() => set('vehicle_type', t.value)}
                >
                  <i className={`fa-solid ${t.icon}`}></i>
                  <strong>{t.label}</strong>
                  <span>{t.note}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="reg-plate">Registration number</label>
            <input
              id="reg-plate"
              name="vehicle_number"
              className="auth-input auth-plate-input"
              placeholder="TS09 AB 1234"
              value={formData.vehicle_number}
              onChange={(e) => set('vehicle_number', e.target.value.toUpperCase())}
              autoCapitalize="characters"
              autoFocus
              required
            />
          </div>

          <div className="auth-grid-2">
            <AuthField id="reg-model" label="Model" optional icon="fa-tag" name="vehicle_model" placeholder={formData.vehicle_type === 'two_wheeler' ? 'Honda Activa' : 'Hyundai i20'} value={formData.vehicle_model} onChange={handleChange} />
            <AuthField id="reg-color" label="Colour" optional icon="fa-palette" name="vehicle_color" placeholder="White" value={formData.vehicle_color} onChange={handleChange} />
          </div>

          <div className="auth-actions">
            <button type="button" className="btn btn-lg" onClick={() => { setStep(1); setError(''); }} disabled={loading}>
              <i className="fa-solid fa-arrow-left"></i> Back
            </button>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Creating account…</> : 'Create account'}
            </button>
          </div>
        </form>
      )}
    </AuthShell>
  );
};

export default RegisterPage;
