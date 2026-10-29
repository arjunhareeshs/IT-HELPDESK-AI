import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { KNOWLEDGE_BASE_ARTICLES } from '../data/mockData';

export default function StudentView({ tickets, onNewTicket, onSelectTicket }) {
  const { currentUser } = useAuth();
  const [activeFaq, setActiveFaq] = useState(null);

  // Filter tickets created by student or general student-relevant
  const studentTickets = tickets.filter(
    t => t.creatorRole === 'student' || t.creatorEmail === currentUser?.email
  );

  const studentFaqs = [
    {
      id: 'faq-1',
      question: 'How do I connect my phone or laptop to campus eduroam Wi-Fi?',
      answer: 'Select "eduroam" from your Wi-Fi settings. When prompted, log in with your full student email (e.g., yourname@campus.edu) and campus password. Trust the campus root certificate when prompted.'
    },
    {
      id: 'faq-2',
      question: 'How do I access MATLAB, SolidWorks, or Adobe Creative Cloud?',
      answer: 'Log in to the Campus Virtual Desktop Infrastructure (VDI) at vdi.campus.edu using VMware Horizon Client or your web browser. All licensed student software is pre-installed.'
    },
    {
      id: 'faq-3',
      question: 'Where can I release my library print jobs?',
      answer: 'Upload documents to papercut.campus.edu. Tap your student ID card on any touch terminal in Library West or the Engineering Commons to release your print job.'
    }
  ];

  // Calculate progress step (1 to 4)
  const getProgressStep = (status) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 2; // Submitted & AI Triaged
      case 'in progress':
        return 3;
      case 'resolved':
      case 'closed':
        return 4;
      default:
        return 1;
    }
  };

  return (
    <div className="role-dashboard-container student-dashboard-theme">
      {/* Student Welcome Hero Banner */}
      <div className="student-welcome-hero">
        <div className="student-hero-content">
          <div className="hero-top-row">
            <span className="hero-role-pill">🎓 Student Support Portal</span>
            <span className="hero-student-id">Student ID: {currentUser?.studentId || 'STU-98421'}</span>
          </div>

          <h1 className="hero-title">Welcome back, {currentUser?.name?.split(' ')[0] || 'Alex'}!</h1>
          <p className="hero-subtitle">
            Need campus Wi-Fi help, lab software access, or dormitory tech assistance? Submit a support request or tap any card below to track live technician updates.
          </p>

          {/* Student Quick Action Tiles */}
          <div className="student-quick-tiles">
            <button type="button" className="student-action-tile primary-tile" onClick={onNewTicket}>
              <span className="tile-icon">➕</span>
              <div className="tile-text">
                <span className="tile-title">Submit Support Ticket</span>
                <span className="tile-desc">Fast AI triage & routing</span>
              </div>
            </button>

            <div className="student-action-tile" onClick={() => setActiveFaq(activeFaq === 'faq-1' ? null : 'faq-1')}>
              <span className="tile-icon">📶</span>
              <div className="tile-text">
                <span className="tile-title">Wi-Fi & Network</span>
                <span className="tile-desc">eduroam setup guide</span>
              </div>
            </div>

            <div className="student-action-tile" onClick={() => setActiveFaq(activeFaq === 'faq-2' ? null : 'faq-2')}>
              <span className="tile-icon">💻</span>
              <div className="tile-text">
                <span className="tile-title">Software & VDI</span>
                <span className="tile-desc">MATLAB, Adobe, SolidWorks</span>
              </div>
            </div>

            <div className="student-action-tile" onClick={() => setActiveFaq(activeFaq === 'faq-3' ? null : 'faq-3')}>
              <span className="tile-icon">🖨️</span>
              <div className="tile-text">
                <span className="tile-title">Printing Quota</span>
                <span className="tile-desc">PaperCut mobile release</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Student Grid */}
      <div className="student-layout-grid">
        {/* Left Column: My Tickets with Visual Stepper */}
        <div className="student-tickets-section">
          <div className="section-header-row">
            <div>
              <h2 className="section-title">My Support Requests</h2>
              <p className="section-desc">Touch any card to inspect full details, AI triage root cause, and technician notes</p>
            </div>
            <div className="header-badge-group">
              <span className="count-badge">{studentTickets.length} Active Requests</span>
            </div>
          </div>

          <div className="tickets-list">
            {studentTickets.length === 0 ? (
              <div className="empty-tickets-card">
                <span className="empty-icon">🎉</span>
                <h3>No active tickets</h3>
                <p>All your support requests have been resolved or you haven't opened any yet.</p>
                <button type="button" className="btn-hero-primary" onClick={onNewTicket} style={{ marginTop: '12px' }}>
                  + Submit a Request
                </button>
              </div>
            ) : (
              studentTickets.map(ticket => {
                const step = getProgressStep(ticket.status);
                return (
                  <div
                    key={ticket.id}
                    className="student-ticket-card interactive-card"
                    onClick={() => onSelectTicket(ticket)}
                    role="button"
                    tabIndex={0}
                    title="Touch to view complete details"
                  >
                    {/* Top Row: ID, Badges, Touch Prompt */}
                    <div className="ticket-card-top">
                      <div className="ticket-id-group">
                        <span className="ticket-id-tag">{ticket.id}</span>
                        <span className={`status-badge status-${ticket.status.toLowerCase().replace(' ', '-')}`}>
                          <span className="status-dot" />
                          {ticket.status}
                        </span>
                        <span className={`priority-badge priority-${ticket.priority.toLowerCase()}`}>
                          {ticket.priority}
                        </span>
                      </div>
                      <span className="touch-hint-pill">
                        <span>Tap for details</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h3 className="ticket-card-title">{ticket.title}</h3>
                    <p className="ticket-card-desc">{ticket.description}</p>

                    {/* 4-Stage Visual Progress Stepper */}
                    <div className="ticket-progress-stepper">
                      <div className="stepper-track">
                        <div
                          className="stepper-fill"
                          style={{ width: `${((step - 1) / 3) * 100}%` }}
                        />
                      </div>
                      <div className="stepper-steps">
                        <div className={`step-node ${step >= 1 ? 'completed' : ''}`}>
                          <div className="node-circle">1</div>
                          <span className="node-label">Submitted</span>
                        </div>
                        <div className={`step-node ${step >= 2 ? 'completed' : ''}`}>
                          <div className="node-circle">2</div>
                          <span className="node-label">AI Triaged</span>
                        </div>
                        <div className={`step-node ${step >= 3 ? 'completed active' : ''}`}>
                          <div className="node-circle">3</div>
                          <span className="node-label">In Progress</span>
                        </div>
                        <div className={`step-node ${step >= 4 ? 'completed' : ''}`}>
                          <div className="node-circle">4</div>
                          <span className="node-label">Resolved</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: Category & Assigned Tech */}
                    <div className="ticket-card-footer">
                      <div className="footer-meta-item">
                        <span className="ticket-category-tag">{ticket.category}</span>
                        <span className="ticket-assigned-text">
                          👨‍💻 Assigned: <strong>{ticket.assignedTo}</strong>
                        </span>
                      </div>

                      {/* AI Confidence Pill */}
                      {ticket.aiTriage && (
                        <div className="student-ai-pill">
                          <span className="sparkle">✨</span>
                          <span>AI Match: <strong>{ticket.aiTriage.confidence}%</strong></span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Student FAQs & Campus Commons */}
        <div className="student-sidebar-section">
          {/* Interactive Student FAQ Card */}
          <div className="quick-help-card">
            <div className="quick-help-header">
              <span className="sparkle-icon">💡</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Quick Student Solutions</h3>
                <span style={{ fontSize: '0.75rem', color: '#666' }}>Tap to view instant fix</span>
              </div>
            </div>

            <div className="student-faq-accordion">
              {studentFaqs.map(faq => {
                const isOpen = activeFaq === faq.id;
                return (
                  <div key={faq.id} className={`faq-accordion-item ${isOpen ? 'open' : ''}`}>
                    <button
                      type="button"
                      className="faq-question-btn"
                      onClick={() => setActiveFaq(isOpen ? null : faq.id)}
                    >
                      <span>{faq.question}</span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="faq-answer-content">
                        <p>{faq.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Campus IT Hours & Walk-in Commons */}
          <div className="campus-info-box">
            <div className="commons-header">
              <span className="commons-live-indicator" />
              <div>
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#1F1F1F', fontWeight: 700 }}>
                  Campus Tech Commons
                </h4>
                <span className="commons-status-text">🟢 Open Now • Walk-in Support</span>
              </div>
            </div>

            <div className="commons-details-list">
              <div className="commons-row">
                <span className="commons-icon">📍</span>
                <div>
                  <strong>Location:</strong>
                  <div>1st Floor, Library West (Next to Café)</div>
                </div>
              </div>
              <div className="commons-row">
                <span className="commons-icon">⏰</span>
                <div>
                  <strong>Hours Today:</strong>
                  <div>Mon–Thu: 8:00 AM – 10:00 PM</div>
                </div>
              </div>
              <div className="commons-row">
                <span className="commons-icon">📞</span>
                <div>
                  <strong>Campus Hotline:</strong>
                  <div>(555) 019-4357 (ext. 4357)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
