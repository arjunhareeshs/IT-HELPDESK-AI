import React, { useState, useRef, useEffect } from 'react';
import HelpdeskLogo from './HelpdeskLogo';
import GoogleIcon from './GoogleIcon';
import { useAuth } from '../context/AuthContext';
import { DEMO_USERS } from '../data/mockData';

export default function Navbar({ activeTab, onTabChange, onOpenProfile, onOpenSettings, onNewTicket }) {
  const { currentUser, authProvider, logout, switchRole } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setIsRoleMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = () => {
    setIsDropdownOpen(false);
    logout();
    window.location.hash = '#/login';
  };

  const navTabs = [
    { id: 'overview', label: 'Dashboard' },
    { id: 'tickets', label: 'Tickets' },
    { id: 'triage', label: 'AI Triage' },
    { id: 'knowledge', label: 'Knowledge Base' },
    { id: 'analytics', label: 'System Analytics' }
  ];

  return (
    <header className="dashboard-top-navbar">
      <div className="navbar-container">
        {/* Left: Brand Logo & Navigation Links */}
        <div className="navbar-left">
          <div
            className="navbar-brand-clickable"
            onClick={() => onTabChange('overview')}
            role="button"
            tabIndex={0}
          >
            <HelpdeskLogo size="medium" />
          </div>

          <nav className="navbar-desktop-nav" aria-label="Main Navigation">
            {navTabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`nav-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right: Search, Role Switcher, New Ticket, User Avatar & Menu */}
        <div className="navbar-right">
          {/* Quick Submit Ticket Action */}
          <button
            type="button"
            className="btn-new-ticket"
            onClick={onNewTicket}
            title="Create a new support ticket"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="btn-new-ticket-text">New Ticket</span>
          </button>

          {/* Quick Role Switcher Pill */}
          <div className="role-switcher-pill" title="Current demo persona - click avatar menu to switch">
            <span className="role-pill-indicator" />
            <span className="role-pill-text">{currentUser?.roleLabel || 'Demo'}</span>
          </div>

          {/* User Account Avatar & Dropdown */}
          <div className="account-dropdown-wrapper" ref={dropdownRef}>
            <button
              type="button"
              className="user-avatar-btn"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              aria-expanded={isDropdownOpen}
              aria-label="Account menu"
              title={`Signed in as ${currentUser?.name}`}
            >
              <div
                className="user-nav-avatar"
                style={{ backgroundColor: currentUser?.avatarBg || '#8E1EA2' }}
              >
                {currentUser?.avatarInitials || 'HD'}
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Google-inspired Account Dropdown Menu */}
            {isDropdownOpen && (
              <div className="account-dropdown-menu" role="menu">
                {/* User Info Header */}
                <div className="menu-user-header">
                  <div
                    className="menu-large-avatar"
                    style={{ backgroundColor: currentUser?.avatarBg || '#8E1EA2' }}
                  >
                    {currentUser?.avatarInitials || 'HD'}
                  </div>
                  <div className="menu-user-details">
                    <div className="menu-user-name">{currentUser?.name}</div>
                    <div className="menu-user-email">{currentUser?.email}</div>
                    <div className="menu-role-badge">
                      <span>{currentUser?.roleLabel}</span>
                      {authProvider === 'google' && (
                        <span className="google-badge-tag" title="Authenticated via Google Sign-In Demo">
                          <GoogleIcon size={12} /> Google
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="menu-divider" />

                {/* Switch Role Quick Section */}
                <div className="menu-section-label">Switch Campus Role:</div>
                <div className="menu-role-list">
                  {DEMO_USERS.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      className={`menu-role-option ${currentUser?.role === u.role ? 'selected' : ''}`}
                      onClick={() => {
                        switchRole(u.role);
                        setIsDropdownOpen(false);
                      }}
                    >
                      <span className="role-dot" style={{ backgroundColor: u.avatarBg }} />
                      <div className="role-option-info">
                        <span className="role-opt-name">{u.roleLabel}</span>
                        <span className="role-opt-user">({u.name})</span>
                      </div>
                      {currentUser?.role === u.role && (
                        <span className="check-mark">✓</span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="menu-divider" />

                {/* Profile & Settings Links */}
                <div className="menu-actions-list">
                  <button
                    type="button"
                    className="menu-action-item"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onOpenProfile();
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span>My Profile</span>
                  </button>

                  <button
                    type="button"
                    className="menu-action-item"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onOpenSettings();
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    <span>Account Settings</span>
                  </button>
                </div>

                <div className="menu-divider" />

                {/* Sign Out Button */}
                <div className="menu-signout-row">
                  <button
                    id="sign-out-btn"
                    type="button"
                    className="btn-menu-signout"
                    onClick={handleSignOut}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
