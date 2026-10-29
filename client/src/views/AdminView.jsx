import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { DEMO_USERS, SYSTEM_METRICS } from '../data/mockData';

export default function AdminView({ tickets, onNewTicket, onSelectTicket }) {
  const { currentUser, switchRole, showToast } = useAuth();
  const [activeAdminSubTab, setActiveAdminSubTab] = useState('metrics'); // 'metrics' | 'users' | 'triage_rules'
  const [aiConfidenceThreshold, setAiConfidenceThreshold] = useState(90);

  const handleSaveTriageRules = (e) => {
    e.preventDefault();
    showToast(`AI Auto-Routing threshold updated to ${aiConfidenceThreshold}%`, 'success');
  };

  return (
    <div className="role-dashboard-container admin-dashboard-theme">
      {/* Admin Welcome Hero */}
      <div className="admin-welcome-hero">
        <div className="admin-hero-content">
          <div className="admin-top-badge-row">
            <span className="admin-portal-pill">🛡️ Enterprise IT Administration</span>
            <span className="admin-id-pill">Admin ID: {currentUser?.adminId || 'ADM-00101'}</span>
            <span className="admin-uptime-pill">🟢 99.98% System Uptime</span>
          </div>

          <h1 className="hero-title">Director Operations & Telemetry Center</h1>
          <p className="hero-subtitle">
            Campus-wide surveillance of support ticket volumes, AI NLP triage precision, SLA compliance thresholds, and campus service roles. Touch any ticket in the ledger to inspect root cause diagnostics.
          </p>

          <div className="admin-quick-actions">
            <button type="button" className="btn-hero-primary" onClick={onNewTicket}>
              + Dispatch Priority Ticket
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card">
          <div className="kpi-top">
            <span className="kpi-title">Active Tickets</span>
            <span className="kpi-icon-bubble">📋</span>
          </div>
          <div className="admin-kpi-num">{tickets.length}</div>
          <div className="admin-kpi-delta positive">↑ 12% vs last week</div>
        </div>

        <div className="admin-kpi-card highlight-purple">
          <div className="kpi-top">
            <span className="kpi-title">AI Triage Accuracy</span>
            <span className="kpi-icon-bubble">✨</span>
          </div>
          <div className="admin-kpi-num">{SYSTEM_METRICS.aiAccuracy}</div>
          <div className="admin-kpi-delta positive">98.4% auto-routing match</div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-top">
            <span className="kpi-title">Avg Time to Triage</span>
            <span className="kpi-icon-bubble">⚡</span>
          </div>
          <div className="admin-kpi-num">1.8 sec</div>
          <div className="admin-kpi-delta positive">↓ 52% reduction via AI</div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-top">
            <span className="kpi-title">SLA Compliance</span>
            <span className="kpi-icon-bubble">🛡️</span>
          </div>
          <div className="admin-kpi-num">{SYSTEM_METRICS.slaCompliance}</div>
          <div className="admin-kpi-delta positive">Zero critical breaches</div>
        </div>
      </div>

      {/* Admin Sub Navigation */}
      <div className="admin-subtabs">
        <button
          type="button"
          className={`admin-subtab-btn ${activeAdminSubTab === 'metrics' ? 'active' : ''}`}
          onClick={() => setActiveAdminSubTab('metrics')}
        >
          Campus Ticket Ledger ({tickets.length})
        </button>
        <button
          type="button"
          className={`admin-subtab-btn ${activeAdminSubTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveAdminSubTab('users')}
        >
          Campus Roles Directory ({DEMO_USERS.length})
        </button>
        <button
          type="button"
          className={`admin-subtab-btn ${activeAdminSubTab === 'triage_rules' ? 'active' : ''}`}
          onClick={() => setActiveAdminSubTab('triage_rules')}
        >
          AI Triage Model Tuning
        </button>
      </div>

      {/* Tab 1: System Tickets */}
      {activeAdminSubTab === 'metrics' && (
        <div className="admin-card-section">
          <div className="section-header-row">
            <div>
              <h2 className="section-title">Campus-Wide Ticket Ledger</h2>
              <p className="section-desc">Touch any row to view complete ticket details, AI confidence vectors, and technician activity</p>
            </div>
            <button type="button" className="btn-table-action" onClick={onNewTicket}>
              + Dispatch Ticket
            </button>
          </div>

          <div className="staff-tickets-table-card">
            <table className="staff-table interactive-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title & Requester</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned Tech</th>
                  <th>AI Match</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTicket(t)}
                    title="Click row to open ticket modal"
                    className="clickable-table-row"
                  >
                    <td><strong className="table-id-link">{t.id}</strong></td>
                    <td>
                      <div className="table-subject-title">{t.title}</div>
                      <div className="table-subject-desc">
                        By: {t.creatorName} ({t.creatorRole}) • {t.description.substring(0, 50)}...
                      </div>
                    </td>
                    <td><span className="table-cat-badge">{t.category}</span></td>
                    <td>
                      <span className={`priority-badge priority-${t.priority.toLowerCase()}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge status-${t.status.toLowerCase().replace(' ', '-')}`}>
                        {t.status}
                      </span>
                    </td>
                    <td>{t.assignedTo}</td>
                    <td>
                      {t.aiTriage && (
                        <span className="ai-table-pill">✨ {t.aiTriage.confidence}%</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-table-view-details"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTicket(t);
                        }}
                      >
                        Inspect Modal
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Users Directory */}
      {activeAdminSubTab === 'users' && (
        <div className="admin-card-section">
          <div className="section-header-row">
            <div>
              <h2 className="section-title">Campus Roles Directory</h2>
              <p className="section-desc">Active university personas with role permissions and immediate role switching</p>
            </div>
          </div>

          <div className="users-card-grid">
            {DEMO_USERS.map(user => (
              <div key={user.id} className="user-profile-card">
                <div className="user-card-header">
                  <div className="user-card-avatar" style={{ backgroundColor: user.avatarBg }}>
                    {user.avatarInitials}
                  </div>
                  <div>
                    <h3 className="user-card-name">{user.name}</h3>
                    <span className="user-card-role-tag">{user.roleLabel}</span>
                  </div>
                </div>

                <div className="user-card-details">
                  <div><strong>Department:</strong> {user.department}</div>
                  <div><strong>Email:</strong> {user.email}</div>
                  <div><strong>Location:</strong> {user.location}</div>
                  <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#666' }}>{user.bio}</div>
                </div>

                <div className="user-card-footer">
                  <button
                    type="button"
                    className="btn-switch-role"
                    onClick={() => switchRole(user.role)}
                  >
                    Switch to {user.roleLabel}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: AI Triage Rules */}
      {activeAdminSubTab === 'triage_rules' && (
        <div className="admin-card-section">
          <div className="section-header-row">
            <div>
              <h2 className="section-title">AI Triage Model Tuning & Confidence Thresholds</h2>
              <p className="section-desc">Configure automated ticket classification and routing confidence</p>
            </div>
          </div>

          <form onSubmit={handleSaveTriageRules} className="triage-rules-form">
            <div className="rule-config-card">
              <h3 className="rule-title">Auto-Assignment Confidence Threshold</h3>
              <p className="rule-desc">
                Tickets categorized with AI confidence at or above this threshold will be automatically routed to tier-2 teams without manual human intervention.
              </p>
              <div className="threshold-slider-row">
                <input
                  type="range"
                  min="60"
                  max="98"
                  value={aiConfidenceThreshold}
                  onChange={e => setAiConfidenceThreshold(Number(e.target.value))}
                  className="threshold-slider"
                />
                <span className="threshold-val-display">{aiConfidenceThreshold}% Threshold</span>
              </div>
            </div>

            <div className="rule-config-card">
              <h3 className="rule-title">Active Semantic NLP Pipelines</h3>
              <div className="nlp-pipelines-list">
                <div className="pipeline-item">
                  <span className="pipeline-name">Network & Wireless Handshake Analyzer</span>
                  <span className="pipeline-status active">Online (v4.2)</span>
                </div>
                <div className="pipeline-item">
                  <span className="pipeline-name">LMS Gradebook & SIS API Parser</span>
                  <span className="pipeline-status active">Online (v4.2)</span>
                </div>
                <div className="pipeline-item">
                  <span className="pipeline-name">Hardware BSOD & Crash Dump Classifier</span>
                  <span className="pipeline-status active">Online (v4.2)</span>
                </div>
              </div>
            </div>

            <button type="submit" className="btn-purple-primary" style={{ height: '42px', padding: '0 24px' }}>
              Save Triage Configuration
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
