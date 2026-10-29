import React, { useState } from 'react';
import BrandingPanel from '../components/BrandingPanel';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage({ onNavigate }) {
  const { registerDemoAccount } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('student');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const res = await registerDemoAccount({
        fullName,
        email,
        password,
        role
      });
      if (res.success) {
        onNavigate('dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="split-screen-login-viewport">
      <main className="split-screen-auth-card" role="main" aria-labelledby="register-heading">
        {/* Left Side: Branding Panel */}
        <section className="split-column-branding" aria-label="Branding and Logo">
          <BrandingPanel />
        </section>

        {/* Right Side: Registration Form */}
        <section className="split-column-auth" aria-label="Registration form">
          <div className="auth-panel-inner">
            <div className="auth-accent-badge">
              <span className="accent-dot" />
              <span className="accent-text">Join HelpDesk AI</span>
            </div>

            <div className="auth-heading-group">
              <h1 id="register-heading" className="auth-heading-title">Create an account</h1>
              <p className="auth-heading-subtitle">Sign up to access AI-powered campus ticket triage.</p>
            </div>

            <form onSubmit={handleRegister} className="modern-auth-form" noValidate>
              {/* Full Name */}
              <div className="form-group">
                <label htmlFor="reg-fullname" className="form-label">Full name</label>
                <div className={`input-icon-wrapper ${errors.fullName ? 'has-error' : ''}`}>
                  <span className="input-leading-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    id="reg-fullname"
                    type="text"
                    className="form-control with-leading-icon"
                    value={fullName}
                    onChange={e => {
                      setFullName(e.target.value);
                      if (errors.fullName) setErrors(prev => ({ ...prev, fullName: '' }));
                    }}
                    placeholder="Amélie Laurent"
                    disabled={isLoading}
                  />
                </div>
                {errors.fullName && <div className="form-error-msg">{errors.fullName}</div>}
              </div>

              {/* Email Address */}
              <div className="form-group">
                <label htmlFor="reg-email" className="form-label">Email address</label>
                <div className={`input-icon-wrapper ${errors.email ? 'has-error' : ''}`}>
                  <span className="input-leading-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <input
                    id="reg-email"
                    type="email"
                    className="form-control with-leading-icon"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                    }}
                    placeholder="you@campus.edu"
                    disabled={isLoading}
                  />
                </div>
                {errors.email && <div className="form-error-msg">{errors.email}</div>}
              </div>

              {/* Role Selector */}
              <div className="form-group">
                <label className="form-label">Select Demo Role</label>
                <div className="role-pills-row">
                  {[
                    { id: 'student', label: 'Student' },
                    { id: 'staff', label: 'Staff' },
                    { id: 'technician', label: 'IT Tech' },
                    { id: 'admin', label: 'Admin' }
                  ].map(r => (
                    <button
                      key={r.id}
                      type="button"
                      className={`role-select-pill ${role === r.id ? 'active' : ''}`}
                      onClick={() => setRole(r.id)}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Password */}
              <div className="form-group">
                <label htmlFor="reg-password" className="form-label">Password</label>
                <div className={`input-icon-wrapper ${errors.password ? 'has-error' : ''}`}>
                  <span className="input-leading-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-control with-leading-icon with-trailing-icon"
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                    }}
                    placeholder="At least 6 characters"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="input-trailing-action"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && <div className="form-error-msg">{errors.password}</div>}
              </div>

              {/* Confirm Password */}
              <div className="form-group">
                <label htmlFor="reg-confirm-password" className="form-label">Confirm password</label>
                <div className={`input-icon-wrapper ${errors.confirmPassword ? 'has-error' : ''}`}>
                  <span className="input-leading-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    id="reg-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="form-control with-leading-icon with-trailing-icon"
                    value={confirmPassword}
                    onChange={e => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: '' }));
                    }}
                    placeholder="Re-enter password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="input-trailing-action"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.confirmPassword && <div className="form-error-msg">{errors.confirmPassword}</div>}
              </div>

              {/* Submit Button */}
              <button
                id="create-demo-account-btn"
                type="submit"
                className="btn-primary-purple"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="button-spinner" aria-hidden="true" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <span>Create Account</span>
                )}
              </button>
            </form>

            {/* Back to sign in */}
            <div className="auth-switch-prompt">
              <span>Already have an account? </span>
              <button
                type="button"
                className="link-create-account"
                onClick={() => onNavigate('login')}
              >
                Sign in
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
