import React, { useState } from 'react';
import GoogleIcon from './GoogleIcon';
import { DEMO_USERS } from '../data/mockData';

export default function GoogleAccountModal({ isOpen, onClose, onSelectAccount }) {
  const [selectedId, setSelectedId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSelect = async (user) => {
    setSelectedId(user.id);
    setIsSubmitting(true);
    // Simulate brief Google OAuth handshake
    await new Promise(r => setTimeout(r, 600));
    setIsSubmitting(false);
    onSelectAccount(user);
  };

  return (
    <div className="google-modal-backdrop" onClick={onClose}>
      <div className="google-modal-card" onClick={e => e.stopPropagation()}>
        {/* Google Header */}
        <div className="google-modal-header">
          <GoogleIcon size={28} />
          <h2 className="google-modal-title">Choose an account</h2>
          <p className="google-modal-subtitle">
            to continue to <strong style={{ color: '#8E1EA2' }}>HelpDesk AI</strong>
          </p>
        </div>

        {/* Notice Banner */}
        <div className="demo-notice-callout">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8E1EA2" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <div style={{ fontSize: '0.8rem', lineHeight: '1.35', color: '#555555' }}>
            <strong>Campus Google Workspace SSO:</strong> Select your verified university account to continue with single sign-on.
          </div>
        </div>

        {/* Account List */}
        <div className="google-account-list">
          {DEMO_USERS.map(user => {
            const isTarget = selectedId === user.id && isSubmitting;
            return (
              <button
                key={user.id}
                type="button"
                className={`google-account-item ${isTarget ? 'loading' : ''}`}
                onClick={() => handleSelect(user)}
                disabled={isSubmitting}
              >
                <div
                  className="google-account-avatar"
                  style={{ backgroundColor: user.avatarBg }}
                >
                  {user.avatarInitials}
                </div>
                <div className="google-account-info">
                  <div className="google-account-name">{user.name}</div>
                  <div className="google-account-email">{user.email}</div>
                  <div className="google-account-role-tag">{user.roleLabel} • {user.department}</div>
                </div>
                {isTarget ? (
                  <div className="spinner-small" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8E1EA2" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Google Footer Actions */}
        <div className="google-modal-footer">
          <div className="google-legal-text">
            To continue, Google will share your name, email address, and profile demonstration details with HelpDesk AI.
          </div>
          <div className="google-modal-buttons">
            <button
              type="button"
              className="btn-cancel-google"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
