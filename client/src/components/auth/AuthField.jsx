import React, { useState } from 'react';

// A labelled input with a leading icon and an optional hint underneath
export const AuthField = ({ id, label, icon, hint, optional = false, className = '', ...inputProps }) => (
  <div className="auth-field">
    <label className="auth-label" htmlFor={id}>
      {label}
      {optional && <span className="auth-optional">Optional</span>}
    </label>
    <div className="auth-control">
      {icon && <i className={`fa-solid ${icon} auth-control-icon`} aria-hidden="true"></i>}
      <input id={id} className={`auth-input ${icon ? 'has-icon' : ''} ${className}`} {...inputProps} />
    </div>
    {hint && <div className="auth-hint">{hint}</div>}
  </div>
);

// 0 too short, 1 weak, 2 good, 3 strong
export const passwordScore = (pw) => {
  if (!pw || pw.length < 6) return 0;
  let score = 1;
  if (pw.length >= 10) score += 1;
  // Mixing at least three kinds of character (lower, upper, digit, symbol) counts as variety
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(pw)).length;
  if (kinds >= 3) score += 1;
  return Math.min(score, 3);
};

const STRENGTH = ['At least 6 characters', 'Weak', 'Good', 'Strong'];

// Password with a show/hide toggle and, for new passwords, a strength meter
export const PasswordField = ({ id, label = 'Password', value, onChange, isNew = false, ...inputProps }) => {
  const [visible, setVisible] = useState(false);
  const score = passwordScore(value);
  return (
    <div className="auth-field">
      <label className="auth-label" htmlFor={id}>{label}</label>
      <div className="auth-control">
        <i className="fa-solid fa-lock auth-control-icon" aria-hidden="true"></i>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className="auth-input has-icon has-toggle"
          value={value}
          onChange={onChange}
          autoComplete={isNew ? 'new-password' : 'current-password'}
          minLength={isNew ? 6 : undefined}
          {...inputProps}
        />
        <button type="button" className="auth-pw-toggle" onClick={() => setVisible((v) => !v)} aria-label={visible ? 'Hide password' : 'Show password'}>
          <i className={`fa-solid ${visible ? 'fa-eye-slash' : 'fa-eye'}`}></i>
        </button>
      </div>
      {isNew && (
        <div className={`auth-strength s${value ? score : 0}`} aria-live="polite">
          <span className="auth-strength-bars"><i></i><i></i><i></i></span>
          <span className="auth-strength-label">{value ? STRENGTH[score] : STRENGTH[0]}</span>
        </div>
      )}
    </div>
  );
};

export const AuthError = ({ message }) => message ? (
  <div className="auth-error" role="alert">
    <i className="fa-solid fa-circle-exclamation"></i>
    <span>{message}</span>
  </div>
) : null;
