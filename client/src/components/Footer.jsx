import React, { useState } from 'react';

export default function Footer() {
  const [activeModal, setActiveModal] = useState(null); // 'help' | 'privacy' | 'terms' | null

  return (
    <>
      <footer className="auth-footer">
        <div className="auth-footer-container">
          <div className="footer-lang-selector">
            <select aria-label="Language Selector" defaultValue="en-US" className="lang-select">
              <option value="en-US">English (United States)</option>
              <option value="en-GB">English (United Kingdom)</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
            </select>
          </div>

          <div className="footer-links">
            <button
              type="button"
              className="footer-link-btn"
              onClick={() => setActiveModal('help')}
            >
              Help
            </button>
            <button
              type="button"
              className="footer-link-btn"
              onClick={() => setActiveModal('privacy')}
            >
              Privacy
            </button>
            <button
              type="button"
              className="footer-link-btn"
              onClick={() => setActiveModal('terms')}
            >
              Terms
            </button>
          </div>
        </div>
      </footer>

      {/* Info Popover Modals for Help, Privacy, Terms */}
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
                    For this frontend demonstration, you can use any of the predefined demonstration roles (Student, Staff, IT Technician, Administrator) by clicking the quick-fill buttons or using the Google sign-in simulation.
                  </p>
                  <p style={{ marginTop: '8px' }}>
                    <strong>Campus IT Helpdesk Hotline:</strong> (555) 019-4357<br />
                    <strong>Physical Walk-in:</strong> Tech Commons, 1st Floor Library West<br />
                    <strong>Operating Hours:</strong> Mon–Fri 7:30 AM – 9:00 PM EST
                  </p>
                </div>
              )}
              {activeModal === 'privacy' && (
                <div>
                  <p><strong>Frontend Demonstration Privacy Policy</strong></p>
                  <p>
                    This is a prototype interface developed for evaluation. No passwords, personal identifying information, or Google account tokens are transmitted to external servers.
                  </p>
                  <p style={{ marginTop: '8px' }}>
                    All authentication actions are simulated locally in memory and the browser session. Session storage is cleared on sign out.
                  </p>
                </div>
              )}
              {activeModal === 'terms' && (
                <div>
                  <p><strong>Terms of Demonstration Service</strong></p>
                  <p>
                    This client interface demonstrates the AI-Powered IT Helpdesk Ticket Triage portal, including Google-inspired authentication, role-based workflows, and triage telemetry.
                  </p>
                  <p style={{ marginTop: '8px' }}>
                    Use of this interface is intended solely for evaluation and design verification purposes.
                  </p>
                </div>
              )}
            </div>
            <div className="info-modal-footer">
              <button
                type="button"
                className="btn-purple-primary"
                onClick={() => setActiveModal(null)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
