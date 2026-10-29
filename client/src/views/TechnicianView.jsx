import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function TechnicianView({ tickets, onUpdateTicketStatus, onSelectTicket }) {
  const { currentUser, showToast } = useAuth();
  const [selectedTicket, setSelectedTicket] = useState(tickets[0] || null);
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [techDutyStatus, setTechDutyStatus] = useState('Available');

  // Filter tickets
  const filteredTickets = tickets.filter(t => {
    if (filterPriority !== 'All' && t.priority !== filterPriority) return false;
    if (filterStatus !== 'All' && t.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.id.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.creatorName.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleStatusChange = (ticketId, newStatus) => {
    onUpdateTicketStatus(ticketId, newStatus);
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(prev => ({ ...prev, status: newStatus }));
    }
    showToast(`Updated ticket ${ticketId} to "${newStatus}"`, 'success');
  };

  const handleDutyToggle = () => {
    const nextStatus = techDutyStatus === 'Available' ? 'In Field Dispatch' : 'Available';
    setTechDutyStatus(nextStatus);
    showToast(`Technician duty set to: ${nextStatus}`, 'info');
  };

  return (
    <div className="role-dashboard-container technician-dashboard-theme">
      {/* Tech Header Banner */}
      <div className="tech-welcome-hero">
        <div className="tech-hero-content">
          <div className="tech-top-meta">
            <span className="tech-console-badge">⚡ Tier-2 Engineering Console</span>
            <span className="tech-id-badge">Tech ID: {currentUser?.techId || 'TCH-80124'}</span>
            <button
              type="button"
              className={`duty-status-toggle ${techDutyStatus === 'Available' ? 'status-green' : 'status-amber'}`}
              onClick={handleDutyToggle}
              title="Click to toggle technician availability status"
            >
              <span className="duty-dot" />
              <span>{techDutyStatus}</span>
            </button>
          </div>

          <h1 className="hero-title">IT Service Desk Operations Console</h1>
          <p className="hero-subtitle">
            AI Triage Engine has pre-analyzed and ranked {tickets.length} incoming campus support tickets. Touch any card in the queue to open full root-cause diagnostics, or execute rapid status updates below.
          </p>

          {/* Quick Metrics Bar */}
          <div className="tech-metrics-ribbon">
            <div className="ribbon-metric">
              <span className="ribbon-val">{filteredTickets.length}</span>
              <span className="ribbon-label">Queue Backlog</span>
            </div>
            <div className="ribbon-divider" />
            <div className="ribbon-metric">
              <span className="ribbon-val urgent">{tickets.filter(t => t.priority === 'Critical' || t.priority === 'High').length}</span>
              <span className="ribbon-label">High / Critical</span>
            </div>
            <div className="ribbon-divider" />
            <div className="ribbon-metric">
              <span className="ribbon-val">96.8%</span>
              <span className="ribbon-label">AI Auto-Routing Match</span>
            </div>
            <div className="ribbon-divider" />
            <div className="ribbon-metric">
              <span className="ribbon-val positive">0 Breaches</span>
              <span className="ribbon-label">SLA Compliance</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="tech-filters-bar">
        <div className="tech-search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="tech-search-input"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tickets by ID, subject, requester, or keyword..."
          />
        </div>

        <div className="tech-filter-dropdowns">
          <div className="filter-group">
            <label>Priority:</label>
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="tech-select"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical Only</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Status:</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="tech-select"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2-Column Split: Queue on Left, Deep AI Triage on Right */}
      <div className="tech-split-layout">
        {/* Left Column: Tickets Queue */}
        <div className="tech-queue-column">
          <div className="queue-header">
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                Active Triage Queue ({filteredTickets.length})
              </h3>
              <span style={{ fontSize: '0.775rem', color: '#666' }}>
                Touch any card to open full detailed popup & playbook
              </span>
            </div>
          </div>

          <div className="tech-ticket-items">
            {filteredTickets.map(ticket => (
              <div
                key={ticket.id}
                className={`tech-queue-card interactive-card ${selectedTicket?.id === ticket.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedTicket(ticket);
                  if (onSelectTicket) onSelectTicket(ticket);
                }}
                role="button"
                tabIndex={0}
                title="Touch to open detailed modal"
              >
                <div className="queue-card-header">
                  <span className="queue-id">{ticket.id}</span>
                  <div className="queue-badge-cluster">
                    <span className={`priority-badge priority-${ticket.priority.toLowerCase()}`}>
                      {ticket.priority}
                    </span>
                    <span className={`status-badge status-${ticket.status.toLowerCase().replace(' ', '-')}`}>
                      {ticket.status}
                    </span>
                  </div>
                </div>

                <div className="queue-card-title">{ticket.title}</div>
                <div className="queue-card-meta">
                  <span>From: <strong>{ticket.creatorName}</strong></span>
                  <span className="meta-category-badge">{ticket.category}</span>
                </div>

                {ticket.aiTriage && (
                  <div className="queue-ai-score">
                    <span>✨ Match: <strong>{ticket.aiTriage.confidence}%</strong></span>
                    <span>Urgency: <strong>{ticket.aiTriage.recommendedUrgency}</strong></span>
                  </div>
                )}

                {/* Direct In-Card Action Strip */}
                <div className="queue-card-actions" onClick={e => e.stopPropagation()}>
                  <button
                    type="button"
                    className="btn-card-inspect"
                    onClick={() => onSelectTicket(ticket)}
                  >
                    View Popup Details
                  </button>

                  {ticket.status !== 'In Progress' && (
                    <button
                      type="button"
                      className="btn-card-quick-status"
                      onClick={() => handleStatusChange(ticket.id, 'In Progress')}
                    >
                      Start Work
                    </button>
                  )}

                  {ticket.status !== 'Resolved' && (
                    <button
                      type="button"
                      className="btn-card-quick-status resolved"
                      onClick={() => handleStatusChange(ticket.id, 'Resolved')}
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: AI Triage & Resolution Console */}
        <div className="tech-detail-column">
          {selectedTicket ? (
            <div>
              <div className="triage-panel-header">
                <div>
                  <span className="triage-ticket-badge">{selectedTicket.id}</span>
                  <h2 className="triage-ticket-title">{selectedTicket.title}</h2>
                  <div className="triage-ticket-requester">
                    Reported by <strong>{selectedTicket.creatorName}</strong> ({selectedTicket.creatorEmail})
                  </div>
                </div>

                <div className="status-changer-box">
                  <span style={{ fontSize: '0.725rem', color: '#666', fontWeight: 600 }}>Update Status:</span>
                  <div className="status-btn-group">
                    <button
                      type="button"
                      className={`btn-status-toggle ${selectedTicket.status === 'Open' ? 'active' : ''}`}
                      onClick={() => handleStatusChange(selectedTicket.id, 'Open')}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      className={`btn-status-toggle ${selectedTicket.status === 'In Progress' ? 'active' : ''}`}
                      onClick={() => handleStatusChange(selectedTicket.id, 'In Progress')}
                    >
                      In Progress
                    </button>
                    <button
                      type="button"
                      className={`btn-status-toggle ${selectedTicket.status === 'Resolved' ? 'active' : ''}`}
                      onClick={() => handleStatusChange(selectedTicket.id, 'Resolved')}
                    >
                      Resolved
                    </button>
                  </div>
                </div>
              </div>

              {/* Ticket Description */}
              <div className="triage-section">
                <div className="triage-section-title">Reported Description</div>
                <div className="triage-desc-box">{selectedTicket.description}</div>
              </div>

              {/* Deep AI Triage Analysis */}
              {selectedTicket.aiTriage && (
                <div className="triage-ai-deep-box">
                  <div className="ai-deep-header">
                    <span className="sparkle">✨</span>
                    <strong style={{ fontSize: '0.9rem', color: '#8E1EA2' }}>
                      AI Automated Triage Diagnostics
                    </strong>
                    <span className="ai-conf-score">
                      {selectedTicket.aiTriage.confidence}% Confidence
                    </span>
                  </div>

                  <div className="ai-deep-grid">
                    <div className="ai-deep-item">
                      <label>Predicted Category</label>
                      <span>{selectedTicket.aiTriage.predictedCategory}</span>
                    </div>

                    <div className="ai-deep-item">
                      <label>User Sentiment</label>
                      <span>{selectedTicket.aiTriage.sentiment}</span>
                    </div>

                    <div className="ai-deep-item full-width">
                      <label>Identified Root Cause</label>
                      <span style={{ fontWeight: 600, color: '#252033' }}>
                        {selectedTicket.aiTriage.rootCause}
                      </span>
                    </div>

                    <div className="ai-deep-item full-width">
                      <label>Recommended Resolution Playbook</label>
                      <span style={{ color: '#137333', fontWeight: 600 }}>
                        {selectedTicket.aiTriage.suggestedFix}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* View Complete Modal Button */}
              <button
                type="button"
                className="btn-purple-primary full-width"
                style={{ marginTop: '20px', height: '44px' }}
                onClick={() => onSelectTicket(selectedTicket)}
              >
                Open Full Modal & Playbook Checklist →
              </button>
            </div>
          ) : (
            <div className="no-selection-box">
              <span style={{ fontSize: '2rem' }}>🔍</span>
              <p>Select any ticket from the left queue to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
