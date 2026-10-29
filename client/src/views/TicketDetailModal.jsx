import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * TicketDetailModal
 *
 * Rich, interactive detail popup opened when touching/clicking any ticket card.
 * Features:
 * - Ticket ID, status badge, priority with icon, timestamp
 * - Full title, requester info, assigned technician
 * - Detailed formatted description
 * - AI Triage Intelligence diagnostics:
 *   - AI Confidence meter with animated progress bar
 *   - Sentiment analysis tag
 *   - Identified root cause analysis
 *   - Recommended resolution playbook with interactive checklist
 * - Ticket activity timeline & audit log
 * - Interactive notes & quick reply input
 * - Live status updater (Open, In Progress, Resolved)
 * - Accessible: ESC key support, backdrop click to close
 */
export default function TicketDetailModal({ isOpen, ticket, onClose, onUpdateStatus, onAddNote }) {
  const { currentUser, showToast } = useAuth();
  const [newNote, setNewNote] = useState('');
  const [completedSteps, setCompletedSteps] = useState({});
  const [localNotes, setLocalNotes] = useState([]);

  // Sync state when ticket changes
  useEffect(() => {
    if (ticket) {
      setNewNote('');
      setCompletedSteps({});
      setLocalNotes(ticket.activityNotes || [
        {
          id: 'note-1',
          author: ticket.creatorName,
          role: ticket.creatorRole,
          timestamp: ticket.createdAt,
          content: 'Ticket submitted via Campus IT Self-Service Portal.'
        },
        {
          id: 'note-2',
          author: 'AI Triage Engine',
          role: 'system',
          timestamp: ticket.createdAt,
          content: `AI categorized as "${ticket.category}" with ${ticket.aiTriage?.confidence || 95}% confidence. Auto-routed to ${ticket.assignedTo}.`
        }
      ]);
    }
  }, [ticket]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !ticket) return null;

  // Toggle checklist step
  const toggleStep = (index) => {
    setCompletedSteps(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Add comment / note
  const handleAddNoteSubmit = (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    const noteObj = {
      id: `note-${Date.now()}`,
      author: currentUser?.name || 'You',
      role: currentUser?.role || 'user',
      timestamp: new Date().toISOString(),
      content: newNote.trim()
    };

    setLocalNotes(prev => [...prev, noteObj]);
    if (onAddNote) {
      onAddNote(ticket.id, noteObj);
    }
    setNewNote('');
    showToast('Update note added to ticket history', 'success');
  };

  // Handle status update
  const handleStatusChange = (newStatus) => {
    if (onUpdateStatus) {
      onUpdateStatus(ticket.id, newStatus);
    }
    const updateNote = {
      id: `status-${Date.now()}`,
      author: currentUser?.name || 'You',
      role: currentUser?.role || 'user',
      timestamp: new Date().toISOString(),
      content: `Status updated to "${newStatus}".`
    };
    setLocalNotes(prev => [...prev, updateNote]);
    showToast(`Ticket status updated to "${newStatus}"`, 'success');
  };

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Just now';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Sample playbook steps based on category
  const getPlaybookSteps = () => {
    if (ticket.category === 'Network & Wireless') {
      return [
        'Inspect Cisco / Aruba AP connection logs for roaming failures',
        'Verify client MAC address in campus 802.1X RADIUS server',
        'Check DHCP lease allocation in subnet',
        'Advise user to re-install campus CA certificate profile v4.2'
      ];
    }
    if (ticket.category === 'Academic Software') {
      return [
        'Check Canvas LMS and SIS API Gateway latency and error codes',
        'Inspect user OAuth token and role authorization in Active Directory',
        'Clear server-side cache and verify grade export webhook',
        'Confirm successful sync with registrar database'
      ];
    }
    if (ticket.category === 'Hardware & Lab') {
      return [
        'Check device crash dumps / Event Viewer (VIDEO_TDR_FAILURE)',
        'Run Display Driver Uninstaller (DDU) in safe mode',
        'Deploy verified OEM enterprise graphics driver package',
        'Run 15-minute 3D benchmark test to confirm stability'
      ];
    }
    return [
      'Verify user credentials and permissions in campus directory',
      'Run diagnostic script for reported hardware/software',
      'Confirm resolution with requester and update service ledger'
    ];
  };

  const playbookSteps = getPlaybookSteps();

  return (
    <div className="ticket-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-ticket-title">
      <div className="ticket-detail-modal-card" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="ticket-modal-header">
          <div className="ticket-modal-header-left">
            <span className="modal-ticket-id">{ticket.id}</span>
            <span className={`status-badge status-${ticket.status.toLowerCase().replace(' ', '-')}`}>
              <span className="status-dot" />
              {ticket.status}
            </span>
            <span className={`priority-badge priority-${ticket.priority.toLowerCase()}`}>
              {ticket.priority === 'Critical' && '🔥 '}
              {ticket.priority === 'High' && '⚡ '}
              {ticket.priority === 'Medium' && '⏱️ '}
              {ticket.priority === 'Low' && '🟢 '}
              {ticket.priority} Priority
            </span>
          </div>

          <button
            type="button"
            className="ticket-modal-close-btn"
            onClick={onClose}
            aria-label="Close ticket details"
            title="Close (Esc)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="ticket-modal-body">
          {/* Ticket Title & Quick Meta Strip */}
          <div className="modal-title-section">
            <h2 id="modal-ticket-title" className="modal-ticket-title">{ticket.title}</h2>
            
            <div className="modal-meta-strip">
              <div className="meta-pill">
                <span className="meta-pill-label">Category:</span>
                <span className="meta-pill-val">{ticket.category}</span>
              </div>
              <div className="meta-pill">
                <span className="meta-pill-label">Requester:</span>
                <span className="meta-pill-val">{ticket.creatorName}</span>
                <span className="meta-pill-sub">({ticket.creatorRole})</span>
              </div>
              <div className="meta-pill">
                <span className="meta-pill-label">Assigned To:</span>
                <span className="meta-pill-val">{ticket.assignedTo}</span>
              </div>
              <div className="meta-pill">
                <span className="meta-pill-label">Created:</span>
                <span className="meta-pill-val">{formatDate(ticket.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Issue Description Card */}
          <div className="modal-section-card">
            <div className="modal-section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <span>User Issue Description</span>
            </div>
            <div className="modal-description-box">
              <p>{ticket.description}</p>
            </div>
          </div>

          {/* AI Triage & Deep Diagnostics Box */}
          {ticket.aiTriage && (
            <div className="modal-section-card ai-triage-diagnostics-card">
              <div className="ai-diagnostics-header">
                <div className="ai-badge-group">
                  <span className="ai-sparkle-glow">✨</span>
                  <h3 className="ai-diagnostics-title">AI Auto-Triage Intelligence</h3>
                  <span className="ai-version-pill">NLP Engine v4.2</span>
                </div>
                <div className="ai-confidence-wrap">
                  <span className="ai-confidence-label">Confidence Score:</span>
                  <div className="ai-confidence-bar-outer">
                    <div
                      className="ai-confidence-bar-fill"
                      style={{ width: `${ticket.aiTriage.confidence || 95}%` }}
                    />
                  </div>
                  <span className="ai-confidence-percentage">{ticket.aiTriage.confidence || 95}%</span>
                </div>
              </div>

              <div className="ai-diagnostics-grid">
                <div className="ai-metric-item">
                  <span className="metric-label">Predicted Category</span>
                  <span className="metric-value">{ticket.aiTriage.predictedCategory || ticket.category}</span>
                </div>
                <div className="ai-metric-item">
                  <span className="metric-label">Sentiment Detected</span>
                  <span className="metric-value sentiment-pill">
                    {ticket.aiTriage.sentiment === 'Frustrated' && '⚠️ '}
                    {ticket.aiTriage.sentiment === 'Urgent' && '🚨 '}
                    {ticket.aiTriage.sentiment === 'Neutral' && '💬 '}
                    {ticket.aiTriage.sentiment || 'Neutral'}
                  </span>
                </div>
                <div className="ai-metric-item">
                  <span className="metric-label">Recommended Urgency</span>
                  <span className="metric-value">{ticket.aiTriage.recommendedUrgency || ticket.priority}</span>
                </div>
                <div className="ai-metric-item">
                  <span className="metric-label">Auto-Route Dispatch</span>
                  <span className="metric-value">{ticket.aiTriage.autoRoutedTo || ticket.assignedTo}</span>
                </div>

                {/* Root Cause Analysis */}
                <div className="ai-full-width-item root-cause-item">
                  <div className="item-subheading">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8E1EA2" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <strong>Identified Root Cause:</strong>
                  </div>
                  <p className="root-cause-text">{ticket.aiTriage.rootCause}</p>
                </div>

                {/* AI Recommended Fix */}
                <div className="ai-full-width-item fix-item">
                  <div className="item-subheading">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#137333" strokeWidth="2.5">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <strong>Recommended Remediation:</strong>
                  </div>
                  <p className="fix-text">{ticket.aiTriage.suggestedFix}</p>
                </div>
              </div>

              {/* Interactive Troubleshooting Playbook */}
              <div className="playbook-checklist-section">
                <div className="playbook-header">
                  <span className="playbook-icon">📋</span>
                  <strong>Technician Remediation Checklist:</strong>
                  <span className="playbook-subtext">(Click steps to track troubleshooting progress)</span>
                </div>
                <div className="playbook-list">
                  {playbookSteps.map((step, idx) => (
                    <label
                      key={idx}
                      className={`playbook-step-row ${completedSteps[idx] ? 'completed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={!!completedSteps[idx]}
                        onChange={() => toggleStep(idx)}
                        className="playbook-checkbox"
                      />
                      <span className="playbook-step-text">{step}</span>
                      {completedSteps[idx] && <span className="step-done-badge">Done</span>}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Ticket Activity & Notes Timeline */}
          <div className="modal-section-card">
            <div className="modal-section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Activity & Update History ({localNotes.length})</span>
            </div>

            <div className="ticket-timeline-stream">
              {localNotes.map(note => (
                <div key={note.id} className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <strong className="timeline-author">{note.author}</strong>
                      <span className="timeline-role-pill">{note.role}</span>
                      <span className="timeline-time">{formatDate(note.timestamp)}</span>
                    </div>
                    <p className="timeline-text">{note.content}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Add Note Form */}
            <form onSubmit={handleAddNoteSubmit} className="add-note-inline-form">
              <input
                type="text"
                className="add-note-input"
                placeholder="Add technician note or status update..."
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
              />
              <button type="submit" className="btn-add-note" disabled={!newNote.trim()}>
                Post Update
              </button>
            </form>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="ticket-modal-footer">
          <div className="status-quick-actions">
            <span className="actions-label">Change Status:</span>
            <button
              type="button"
              className={`btn-status-action ${ticket.status === 'Open' ? 'active status-open' : ''}`}
              onClick={() => handleStatusChange('Open')}
            >
              Open
            </button>
            <button
              type="button"
              className={`btn-status-action ${ticket.status === 'In Progress' ? 'active status-in-progress' : ''}`}
              onClick={() => handleStatusChange('In Progress')}
            >
              In Progress
            </button>
            <button
              type="button"
              className={`btn-status-action ${ticket.status === 'Resolved' ? 'active status-resolved' : ''}`}
              onClick={() => handleStatusChange('Resolved')}
            >
              Resolved
            </button>
          </div>

          <button type="button" className="btn-modal-close" onClick={onClose}>
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
