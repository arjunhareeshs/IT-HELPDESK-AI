import React, { useState } from 'react';
import BrandingPanel from '../components/BrandingPanel';

export default function ForgotPasswordPage({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();

    if (!trimmed) {
      setError('Email address is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    // Simulate recovery check
    await new Promise(r => setTimeout(r, 600));
    setIsLoading(false);
    setIsSuccess(true);
  };

  return (
    <div className="split-screen-login-viewport">
      <main className="split-screen-auth-card" role="main" aria-labelledby="recovery-heading">
        {/* Left Side: Branding Panel */}
        <section className="split-column-branding" aria-label="Branding and Logo">
          <BrandingPanel />
        </section>

        {/* Right Side: Recovery Form */}
        <section className="split-column-auth" aria-label="Account recovery form">
          <div className="auth-panel-inner">
            <div className="auth-accent-badge">
              <span className="accent-dot" />
              <span className="accent-text">Account Recovery</span>
            </div>

            <div className="auth-heading-group">
              <h1 id="recovery-heading" className="auth-heading-title">Reset password</h1>
              <p className="auth-heading-subtitle">
                Enter your campus email address to receive password reset instructions.
              </p>
            </div>

            {!isSuccess ? (
              <form onSubmit={handleSubmit} className="modern-auth-form" noValidate>
                <div className="form-group">
                  <label htmlFor="recovery-email" className="form-label">Email address</label>
                  <div className={`input-icon-wrapper ${error ? 'has-error' : ''}`}>
                    <span className="input-leading-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </span>
                    <input
                      id="recovery-email"
                      type="email"
                      className="form-control with-leading-icon"
                      value={email}
                      onChange={e => {
                        setEmail(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="you@campus.edu"
                      disabled={isLoading}
                    />
                  </div>
                  {error && <div className="form-error-msg">{error}</div>}
                </div>

                <button
                  id="recovery-continue-btn"
                  type="submit"
                  className="btn-primary-purple"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="button-spinner" aria-hidden="true" />
                      <span>Verifying Email...</span>
                    </>
                  ) : (
                    <span>Continue</span>
                  )}
                </button>

                <div className="auth-switch-prompt" style={{ marginTop: '20px' }}>
                  <button
                    type="button"
                    className="link-create-account"
                    onClick={() => onNavigate('login')}
                  >
                    ← Return to Login
                  </button>
                </div>
              </form>
            ) : (
              <div className="recovery-success-card">
                <div className="success-badge-circle">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#188038" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 className="recovery-success-title">Password Reset Link Sent</h3>
                <p className="recovery-success-desc">
                  We have dispatched secure recovery instructions to:
                </p>
                <div className="recovery-email-tag">{email}</div>
                <p className="recovery-demo-note">
                  Please check your campus inbox and spam folder. The password reset link remains active for 15 minutes.
                </p>

                <button
                  type="button"
                  className="btn-primary-purple"
                  style={{ marginTop: '20px' }}
                  onClick={() => onNavigate('login')}
                >
                  Back to Sign In
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
