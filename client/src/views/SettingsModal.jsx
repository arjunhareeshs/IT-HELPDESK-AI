import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function SettingsModal({ isOpen, onClose }) {
  const { authProvider, showToast } = useAuth();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState(true);
  const [soundEffects, setSoundEffects] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    showToast('Preferences updated successfully (demo saved)', 'success');
    onClose();
  };

  return (
    <div className="info-modal-backdrop" onClick={onClose}>
      <div className="info-modal-card settings-modal-card" onClick={e => e.stopPropagation()}>
        <div className="info-modal-header">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1F1F1F', margin: 0 }}>
            Account Settings
          </h2>
          <button type="button" className="btn-close-modal" onClick={onClose}>&times;</button>
        </div>

        <div className="settings-modal-body">
          {/* Notification Preferences */}
          <div className="settings-section">
            <h4 className="settings-section-title">Notification Preferences</h4>
            <div className="settings-toggle-row">
              <div>
                <div className="toggle-label">Ticket Status Notifications</div>
                <div className="toggle-desc">Receive real-time alerts when ticket priority or resolution changes</div>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={e => setEmailAlerts(e.target.checked)}
                className="toggle-switch"
              />
            </div>
            <div className="settings-toggle-row">
              <div>
                <div className="toggle-label">AI Triage Recommendations</div>
                <div className="toggle-desc">Display instant AI root cause predictions and suggested fixes</div>
              </div>
              <input
                type="checkbox"
                checked={aiSuggestions}
                onChange={e => setAiSuggestions(e.target.checked)}
                className="toggle-switch"
              />
            </div>
            <div className="settings-toggle-row">
              <div>
                <div className="toggle-label">Audio Alerts for Critical SLA Breaches</div>
                <div className="toggle-desc">Sound chime when emergency tickets arrive</div>
              </div>
              <input
                type="checkbox"
                checked={soundEffects}
                onChange={e => setSoundEffects(e.target.checked)}
                className="toggle-switch"
              />
            </div>
          </div>

          {/* Security & Authentication Info */}
          <div className="settings-section">
            <h4 className="settings-section-title">Security & Session Details</h4>
            <div className="security-info-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="security-status-badge">SESSION ACTIVE</span>
                <span style={{ fontSize: '0.8rem', color: '#137333', fontWeight: 600 }}>Encrypted TLS 1.3</span>
              </div>
              <p style={{ fontSize: '0.825rem', color: '#555', margin: 0, lineHeight: 1.4 }}>
                Active auth session: <strong>{authProvider === 'google' ? 'Google Workspace Enterprise SSO' : 'Campus Identity SSO'}</strong>. Session credentials are securely managed.
              </p>
            </div>
          </div>
        </div>

        <div className="info-modal-footer">
          <button type="button" className="btn-cancel-google" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-purple-primary" onClick={handleSave}>
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
