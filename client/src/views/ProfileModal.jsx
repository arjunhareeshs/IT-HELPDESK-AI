import React from 'react';
import { useAuth } from '../context/AuthContext';
import GoogleIcon from '../components/GoogleIcon';

export default function ProfileModal({ isOpen, onClose }) {
  const { currentUser, authProvider } = useAuth();

  if (!isOpen || !currentUser) return null;

  return (
    <div className="info-modal-backdrop" onClick={onClose}>
      <div className="info-modal-card profile-modal-card" onClick={e => e.stopPropagation()}>
        <div className="info-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1F1F1F' }}>User Profile</span>
            <span className="role-tag-badge">{currentUser.roleLabel}</span>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose}>&times;</button>
        </div>

        <div className="profile-modal-body">
          {/* Avatar and Main Info Banner */}
          <div className="profile-hero-banner">
            <div
              className="profile-hero-avatar"
              style={{ backgroundColor: currentUser.avatarBg || '#8E1EA2' }}
            >
              {currentUser.avatarInitials}
            </div>
            <div className="profile-hero-info">
              <h2 className="profile-hero-name">{currentUser.name}</h2>
              <div className="profile-hero-email">{currentUser.email}</div>
              <div className="profile-hero-title">{currentUser.title}</div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="profile-grid">
            <div className="profile-grid-item">
              <label>Role</label>
              <div className="profile-value">{currentUser.roleLabel}</div>
            </div>
            <div className="profile-grid-item">
              <label>Department / School</label>
              <div className="profile-value">{currentUser.department}</div>
            </div>
            <div className="profile-grid-item">
              <label>Campus ID</label>
              <div className="profile-value">{currentUser.studentId || currentUser.staffId || currentUser.techId || currentUser.adminId || 'DEMO-9912'}</div>
            </div>
            <div className="profile-grid-item">
              <label>Authentication Source</label>
              <div className="profile-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {authProvider === 'google' ? (
                  <>
                    <GoogleIcon size={16} />
                    <span>Google Workspace Enterprise SSO</span>
                  </>
                ) : (
                  <span>Campus Active Directory SSO</span>
                )}
              </div>
            </div>
            <div className="profile-grid-item full-width">
              <label>Campus Location</label>
              <div className="profile-value">{currentUser.location || 'Main Campus'}</div>
            </div>
            <div className="profile-grid-item full-width">
              <label>About Persona</label>
              <div className="profile-value" style={{ fontStyle: 'italic', color: '#555' }}>
                "{currentUser.bio || 'Demonstration account for AI-powered IT helpdesk ticket triage evaluation.'}"
              </div>
            </div>
          </div>
        </div>

        <div className="info-modal-footer">
          <button type="button" className="btn-purple-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
