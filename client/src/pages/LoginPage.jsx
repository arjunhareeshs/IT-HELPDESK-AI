import React, { useState } from 'react';
import BrandingPanel from '../components/BrandingPanel';
import GoogleIcon from '../components/GoogleIcon';
import GoogleAccountModal from '../components/GoogleAccountModal';
import { useAuth } from '../context/AuthContext';
import { DEMO_USERS } from '../data/mockData';

export default function LoginPage({ onNavigate, returnUrl = null }) {
  const { loginWithDemo, loginWithGoogle } = useAuth();

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Validation & Feedback State
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [serverError, setServerError] = useState('');
  const [activeModal, setActiveModal] = useState(null); // 'help' | 'privacy' | 'terms' | null

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      newErrors.email = 'Email address is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 4) {
      newErrors.password = 'Password must be at least 4 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Handler
  const handleSignIn = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const res = await loginWithDemo(email, password, rememberMe);
      if (res.success) {
        if (returnUrl) {
          window.location.hash = returnUrl;
        } else {
          onNavigate('dashboard');
        }
      }
    } catch (err) {
      setServerError('An unexpected error occurred during demo sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Persona selector
  const handleSelectDemoRole = (user) => {
    setEmail(user.email);
    setPassword('DemoPass2026!');
    setErrors({});
    setServerError('');
  };

  // Google Sign-In button click
  const handleGoogleBtnClick = () => {
    setIsGoogleModalOpen(true);
  };

  // Google Account selected from modal
  const handleGoogleAccountSelected = async (user) => {
    setIsGoogleModalOpen(false);
    setIsGoogleLoading(true);
    try {
      const res = await loginWithGoogle(user);
      if (res.success) {
        if (returnUrl) {
          window.location.hash = returnUrl;
        } else {
          onNavigate('dashboard');
        }
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="split-screen-login-viewport">
      {/* Centered Large Authentication Card */}
      <main className="split-screen-auth-card" role="main" aria-labelledby="login-heading">
        {/* ========================================================
            LEFT SIDE (approx 45%): BRANDING & INTERACTIVE LOGO
           ======================================================== */}
        <section className="split-column-branding" aria-label="Branding and Logo">
          <BrandingPanel />
        </section>

        {/* ========================================================
            RIGHT SIDE (approx 55%): DEDICATED LOGIN SYSTEM
           ======================================================== */}
        <section className="split-column-auth" aria-label="Login form">
          <div className="auth-panel-inner">
            {/* Small Product Icon / Accent above heading */}
            <div className="auth-accent-badge form-anim-1">
              <span className="accent-dot" />
              <span className="accent-text">Campus IT Portal</span>
            </div>

            {/* Login Heading & Subtitle */}
            <div className="auth-heading-group">
              <h1 id="login-heading" className="auth-heading-title form-anim-2">Welcome back</h1>
              <p className="auth-heading-subtitle form-anim-3">Sign in to your HelpDesk AI account to continue.</p>
            </div>

            {/* Return URL / Route Guard Notice */}
            {returnUrl && (
              <div className="auth-alert-box alert-route-guard form-anim-4" role="alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8E1EA2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>Please sign in to access the protected dashboard page.</span>
              </div>
            )}

            {/* Server Error Alert */}
            {serverError && (
              <div className="auth-alert-box alert-error form-anim-4" role="alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D93025" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{serverError}</span>
              </div>
            )}

            {/* Demo Personas Quick Select */}
            <div className="demo-persona-strip form-anim-5">
              <div className="strip-label">
                <span>Quick select profile:</span>
              </div>
              <div className="strip-chips">
                {DEMO_USERS.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    className={`persona-chip ${email.toLowerCase() === u.email.toLowerCase() ? 'active' : ''}`}
                    onClick={() => handleSelectDemoRole(u)}
                    title={`Click to fill credentials as ${u.name} (${u.roleLabel})`}
                  >
                    <span className="chip-color-dot" style={{ backgroundColor: u.avatarBg }} />
                    <span className="chip-name">{u.roleLabel}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSignIn} className="modern-auth-form" noValidate>
              {/* Email Address Input with Email Icon */}
              <div className="form-group form-anim-6">
                <label htmlFor="login-email" className="form-label">
                  Email address
                </label>
                <div className={`input-icon-wrapper ${errors.email ? 'has-error' : ''}`}>
                  <span className="input-leading-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    className="form-control with-leading-icon"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                    }}
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={isLoading}
                    aria-describedby={errors.email ? 'email-error-msg' : undefined}
                  />
                </div>
                {errors.email && (
                  <div className="form-error-msg" id="email-error-msg">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{errors.email}</span>
                  </div>
                )}
              </div>

              {/* Password Input with Lock Icon & Show/Hide Toggle */}
              <div className="form-group form-anim-7">
                <label htmlFor="login-password" className="form-label">
                  Password
                </label>
                <div className={`input-icon-wrapper ${errors.password ? 'has-error' : ''}`}>
                  <span className="input-leading-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-control with-leading-icon with-trailing-icon"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                    }}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={isLoading}
                    aria-describedby={errors.password ? 'password-error-msg' : undefined}
                  />
                  <button
                    type="button"
                    className="input-trailing-action"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && (
                  <div className="form-error-msg" id="password-error-msg">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{errors.password}</span>
                  </div>
                )}
              </div>

              {/* Remember Me & Forgot Password on the Same Row */}
              <div className="form-utility-row form-anim-8">
                <label className="checkbox-custom-label">
                  <input
                    id="remember-me-checkbox"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="checkbox-input"
                  />
                  <span className="checkbox-box" aria-hidden="true" />
                  <span className="checkbox-label-text">Remember me</span>
                </label>

                <button
                  type="button"
                  className="link-btn-forgot"
                  onClick={() => onNavigate('forgot-password')}
                >
                  Forgot password?
                </button>
              </div>

              {/* Primary Login Button (Full-Width Purple) */}
              <button
                id="sign-in-btn"
                type="submit"
                className="btn-primary-purple form-anim-9"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="button-spinner" aria-hidden="true" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>

            {/* Alternative Sign-in Centered Divider & Google Button */}
            <div className="auth-alternative-section form-anim-10">
              <div className="auth-divider-wrap">
                <span className="divider-line" />
                <span className="divider-text">Or continue with</span>
                <span className="divider-line" />
              </div>

              {/* Google Sign-in Button */}
              <button
                id="google-signin-btn"
                type="button"
                className="btn-google-continue"
                onClick={handleGoogleBtnClick}
                disabled={isGoogleLoading || isLoading}
              >
                {isGoogleLoading ? (
                  <span className="button-spinner dark" aria-hidden="true" />
                ) : (
                  <GoogleIcon size={19} />
                )}
                <span className="btn-text">
                  {isGoogleLoading ? 'Connecting demo session...' : 'Continue with Google'}
                </span>
              </button>

              {/* Enterprise notice */}
              <p className="google-sub-notice">
                🔒 Enterprise Single Sign-On • Active Directory & Campus Identity
              </p>
            </div>

            {/* Account Creation Link */}
            <div className="auth-switch-prompt form-anim-11">
              <span>Don't have an account? </span>
              <button
                type="button"
                className="link-create-account"
                onClick={() => onNavigate('register')}
              >
                Create an account
              </button>
            </div>

            {/* Small Footer Links */}
            <footer className="auth-bottom-footer form-anim-12">
              <button
                type="button"
                className="footer-nav-link"
                onClick={() => setActiveModal('privacy')}
              >
                Privacy
              </button>
              <span className="footer-dot">•</span>
              <button
                type="button"
                className="footer-nav-link"
                onClick={() => setActiveModal('terms')}
              >
                Terms
              </button>
              <span className="footer-dot">•</span>
              <button
                type="button"
                className="footer-nav-link"
                onClick={() => setActiveModal('help')}
              >
                Help
              </button>
            </footer>
          </div>
        </section>
      </main>

      {/* Simulated Google Account Chooser Modal */}
      <GoogleAccountModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        onSelectAccount={handleGoogleAccountSelected}
      />

      {/* Info Modal for Privacy / Terms / Help */}
      {activeModal && (
        <div className="info-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="info-modal-card" onClick={e => e.stopPropagation()}>
            <div className="info-modal-header">
              <h3>
                {activeModal === 'help' && 'Campus IT Help & Support'}
                {activeModal === 'privacy' && 'Demo Privacy Notice'}
                {activeModal === 'terms' && 'Demo Terms of Service'}
              </h3>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setActiveModal(null)}
              >
                &times;
              </button>
            </div>
            <div className="info-modal-body">
              {activeModal === 'help' && (
                <div>
                  <p><strong>Need help signing in to HelpDesk AI?</strong></p>
                  <p>
                    Use your university email address and password, or sign in via Google Workspace. You can also select any profile from the quick-switch bar.
                  </p>
                  <p style={{ marginTop: '8px' }}>
                    <strong>Campus IT Helpdesk Hotline:</strong> (555) 019-4357<br />
                    <strong>Walk-in:</strong> Tech Commons, 1st Floor Library West<br />
                    <strong>Hours:</strong> Mon–Fri 7:30 AM – 9:00 PM EST
                  </p>
                </div>
              )}
              {activeModal === 'privacy' && (
                <div>
                  <p><strong>Campus Information Security & Privacy</strong></p>
                  <p>
                    All helpdesk authentication and ticket communications are encrypted in transit and at rest. Your campus directory credentials are protected under institutional data governance policies.
                  </p>
                </div>
              )}
              {activeModal === 'terms' && (
                <div>
                  <p><strong>Campus IT Acceptable Use Policy</strong></p>
                  <p>
                    Authorized university access only. Support tickets and AI triage suggestions are monitored by campus network security teams to maintain high service availability.
                  </p>
                </div>
              )}
            </div>
            <div className="info-modal-footer">
              <button
                type="button"
                className="btn-primary-purple"
                style={{ height: '36px', padding: '0 18px', fontSize: '0.85rem' }}
                onClick={() => setActiveModal(null)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
