import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function StaffView({ tickets, onNewTicket, onSelectTicket }) {
  const { currentUser, showToast } = useAuth();
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [filterDept, setFilterDept] = useState('All');

  const staffTickets = tickets.filter(
    t => t.creatorRole === 'staff' || t.creatorEmail === currentUser?.email
  );

  const handleUrgentClassroomAV = () => {
    onNewTicket();
    showToast('Classroom AV Emergency: Select "Hardware & Lab" and specify lecture hall room number', 'info');
  };

  return (
    <div className="role-dashboard-container staff-dashboard-theme">
      {/* Staff Executive Banner */}
      <div className="staff-welcome-hero">
        <div className="staff-hero-content">
          <div className="staff-top-badge-row">
            <span className="staff-portal-pill">🏛️ Faculty & Staff Operations</span>
            <span className="staff-id-pill">Staff ID: {currentUser?.staffId || 'STF-55209'}</span>
            <span className="staff-dept-pill">Department: {currentUser?.department || 'College of Arts & Sciences'}</span>
          </div>

          <h1 className="hero-title">Academic Operations & Technology Desk</h1>
          <p className="hero-subtitle">
            Manage departmental equipment procurement, classroom lecture hall multimedia dispatch, and academic software licenses. Touch any card to inspect full resolution history.
          </p>

          {/* Quick Department Action Buttons */}
          <div className="staff-quick-actions-strip">
            <button
              type="button"
              className="btn-staff-urgent-av"
              onClick={handleUrgentClassroomAV}
              title="Report an urgent multimedia projector or microphone problem during class"
            >
              <span className="btn-icon">🚨</span>
              <div className="btn-text-block">
                <span className="btn-title">Urgent Classroom AV Issue</span>
                <span className="btn-sub">15-minute priority dispatch</span>
              </div>
            </button>

            <button
              type="button"
              className="btn-staff-procure"
              onClick={onNewTicket}
            >
              <span className="btn-icon">💻</span>
              <div className="btn-text-block">
                <span className="btn-title">Department Hardware Request</span>
                <span className="btn-sub">Laptop, monitor dock, accessories</span>
              </div>
            </button>

            <button
              type="button"
              className="btn-staff-standard"
              onClick={onNewTicket}
            >
              <span className="btn-icon">📑</span>
              <div className="btn-text-block">
                <span className="btn-title">Software License Renewal</span>
                <span className="btn-sub">Canvas LMS, SPSS, Zoom Pro</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Staff Operational Metrics Grid */}
      <div className="staff-kpi-row">
        <div className="staff-kpi-card">
          <div className="kpi-icon-wrap">📋</div>
          <div className="kpi-details">
            <div className="kpi-label">Active Department Requests</div>
            <div className="kpi-value">{staffTickets.length}</div>
            <div className="kpi-subtext positive">Tier-2 priority routing</div>
          </div>
        </div>

        <div className="staff-kpi-card highlight-indigo">
          <div className="kpi-icon-wrap">💻</div>
          <div className="kpi-details">
            <div className="kpi-label">Faculty Hardware Refresh</div>
            <div className="kpi-value">1 Pending</div>
            <div className="kpi-subtext">ThinkPad P14s • Approved</div>
          </div>
        </div>

        <div className="staff-kpi-card">
          <div className="kpi-icon-wrap">⏱️</div>
          <div className="kpi-details">
            <div className="kpi-label">Average Resolution Time</div>
            <div className="kpi-value">4.2 hrs</div>
            <div className="kpi-subtext positive">SLA Target: 8.0 hrs (Beat by 47%)</div>
          </div>
        </div>

        <div className="staff-kpi-card">
          <div className="kpi-icon-wrap">🛡️</div>
          <div className="kpi-details">
            <div className="kpi-label">Classroom AV On-Duty</div>
            <div className="kpi-value">Available</div>
            <div className="kpi-subtext positive">Field Tech in Sector 2</div>
          </div>
        </div>
      </div>

      {/* Staff Requests Section with Dual View Toggle */}
      <div className="staff-requests-section">
        <div className="section-header-row">
          <div>
            <h2 className="section-title">Department Support Requests</h2>
            <p className="section-desc">Touch any request card or table row to view full AI triage assessment and timeline</p>
          </div>

          <div className="staff-controls-right">
            {/* View Mode Switcher */}
            <div className="view-toggle-pill">
              <button
                type="button"
                className={`toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
                onClick={() => setViewMode('cards')}
                title="Cards view"
              >
                Cards
              </button>
              <button
                type="button"
                className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Table view"
              >
                Table
              </button>
            </div>

            <button type="button" className="btn-purple-primary" onClick={onNewTicket}>
              + Submit Request
            </button>
          </div>
        </div>

        {/* View Mode 1: Executive Cards Grid */}
        {viewMode === 'cards' ? (
          <div className="staff-cards-grid">
            {staffTickets.map(ticket => (
              <div
                key={ticket.id}
                className="staff-ticket-card interactive-card"
                onClick={() => onSelectTicket(ticket)}
                role="button"
                tabIndex={0}
                title="Touch to open detailed modal"
              >
                <div className="staff-card-top">
                  <span className="staff-ticket-id">{ticket.id}</span>
                  <div className="staff-badge-group">
                    <span className={`status-badge status-${ticket.status.toLowerCase().replace(' ', '-')}`}>
                      <span className="status-dot" />
                      {ticket.status}
                    </span>
                    <span className={`priority-badge priority-${ticket.priority.toLowerCase()}`}>
                      {ticket.priority}
                    </span>
                  </div>
                </div>

                <h3 className="staff-card-title">{ticket.title}</h3>
                <p className="staff-card-desc">{ticket.description}</p>

                {ticket.aiTriage && (
                  <div className="staff-ai-assessment-box">
                    <div className="ai-assessment-top">
                      <span className="sparkle">✨</span>
                      <strong>AI Root Cause Analysis:</strong>
                      <span className="ai-conf-tag">{ticket.aiTriage.confidence}% match</span>
                    </div>
                    <p className="ai-assessment-text">{ticket.aiTriage.rootCause}</p>
                  </div>
                )}

                <div className="staff-card-footer">
                  <span className="dept-tag">{ticket.category}</span>
                  <span className="touch-prompt-text">Touch for full details →</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* View Mode 2: Clean Ledger Table */
          <div className="staff-tickets-table-card">
            <table className="staff-table interactive-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Subject</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned Specialist</th>
                  <th>AI Match</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {staffTickets.map(t => (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTicket(t)}
                    title="Click row to open ticket modal"
                    className="clickable-table-row"
                  >
                    <td><strong className="table-id-link">{t.id}</strong></td>
                    <td>
                      <div className="table-subject-title">{t.title}</div>
                      <div className="table-subject-desc">{t.description.substring(0, 65)}...</div>
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
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
