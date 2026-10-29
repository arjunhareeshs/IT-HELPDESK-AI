import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import StudentView from '../views/StudentView';
import StaffView from '../views/StaffView';
import TechnicianView from '../views/TechnicianView';
import AdminView from '../views/AdminView';
import ProfileModal from '../views/ProfileModal';
import SettingsModal from '../views/SettingsModal';
import NewTicketModal from '../views/NewTicketModal';
import TicketDetailModal from '../views/TicketDetailModal';
import { useAuth } from '../context/AuthContext';
import { INITIAL_TICKETS, KNOWLEDGE_BASE_ARTICLES, SYSTEM_METRICS } from '../data/mockData';

export default function DashboardPage() {
  const { currentUser } = useAuth();

  // Tab State
  const [activeTab, setActiveTab] = useState('overview');

  // Tickets State
  const [tickets, setTickets] = useState(INITIAL_TICKETS);

  // Modals
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [selectedDetailTicket, setSelectedDetailTicket] = useState(null);

  // Status Updater
  const handleUpdateTicketStatus = (ticketId, newStatus) => {
    setTickets(prev =>
      prev.map(t => (t.id === ticketId ? { ...t, status: newStatus } : t))
    );
    if (selectedDetailTicket?.id === ticketId) {
      setSelectedDetailTicket(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  // Add Ticket Note
  const handleAddTicketNote = (ticketId, newNote) => {
    setTickets(prev =>
      prev.map(t => {
        if (t.id === ticketId) {
          const existingNotes = t.activityNotes || [];
          return { ...t, activityNotes: [...existingNotes, newNote] };
        }
        return t;
      })
    );
  };

  // Add Ticket
  const handleAddTicket = (newTicket) => {
    setTickets(prev => [newTicket, ...prev]);
  };

  // Render role-specific dashboard for overview tab
  const renderRoleDashboard = () => {
    switch (currentUser?.role) {
      case 'student':
        return (
          <StudentView
            tickets={tickets}
            onNewTicket={() => setIsNewTicketOpen(true)}
            onSelectTicket={setSelectedDetailTicket}
          />
        );
      case 'staff':
        return (
          <StaffView
            tickets={tickets}
            onNewTicket={() => setIsNewTicketOpen(true)}
            onSelectTicket={setSelectedDetailTicket}
          />
        );
      case 'technician':
        return (
          <TechnicianView
            tickets={tickets}
            onUpdateTicketStatus={handleUpdateTicketStatus}
            onSelectTicket={setSelectedDetailTicket}
          />
        );
      case 'admin':
      default:
        return (
          <AdminView
            tickets={tickets}
            onNewTicket={() => setIsNewTicketOpen(true)}
            onSelectTicket={setSelectedDetailTicket}
          />
        );
    }
  };

  return (
    <div className="dashboard-app-wrapper">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onNewTicket={() => setIsNewTicketOpen(true)}
      />

      {/* Main Content Area */}
      <main className="dashboard-main-content">
        {activeTab === 'overview' && renderRoleDashboard()}

        {/* Tickets Tab (All Roles) */}
        {activeTab === 'tickets' && (
          <div className="role-dashboard-container">
            <div className="section-header-row">
              <div>
                <h1 className="section-title">All Helpdesk Tickets</h1>
                <p className="section-desc">Touch any row to inspect deep ticket diagnostics, root cause, and activity history</p>
              </div>
              <button
                type="button"
                className="btn-purple-primary"
                onClick={() => setIsNewTicketOpen(true)}
              >
                + New Ticket
              </button>
            </div>

            <div className="staff-tickets-table-card">
              <table className="staff-table interactive-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Requester</th>
                    <th>AI Confidence</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(t => (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedDetailTicket(t)}
                      className="clickable-table-row"
                      title="Touch row to open detailed modal"
                    >
                      <td><strong className="table-id-link">{t.id}</strong></td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1F1F1F' }}>{t.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#666' }}>{t.description.substring(0, 60)}...</div>
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
                      <td>{t.creatorName}</td>
                      <td>
                        {t.aiTriage && (
                          <span className="ai-confidence-pill">✨ {t.aiTriage.confidence}%</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-table-view-details"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDetailTicket(t);
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
          </div>
        )}

        {/* AI Triage Tab */}
        {activeTab === 'triage' && (
          <div className="role-dashboard-container">
            <div className="section-header-row">
              <div>
                <h1 className="section-title">AI Ticket Triage Intelligence</h1>
                <p className="section-desc">NLP Semantic classification and automated root-cause detection stream. Touch any card to inspect full telemetry.</p>
              </div>
            </div>

            <div className="triage-stream-grid">
              {tickets.map(ticket => (
                <div
                  key={ticket.id}
                  className="triage-stream-card interactive-card"
                  onClick={() => setSelectedDetailTicket(ticket)}
                  role="button"
                  tabIndex={0}
                  title="Touch to open detailed modal"
                >
                  <div className="triage-stream-top">
                    <span className="stream-ticket-id">{ticket.id}</span>
                    <span className="ai-confidence-badge">✨ {ticket.aiTriage?.confidence || 95}% AI Confidence</span>
                  </div>
                  <h3 className="stream-title">{ticket.title}</h3>
                  <div className="stream-detail-box">
                    <div><strong>Predicted Category:</strong> {ticket.aiTriage?.predictedCategory || ticket.category}</div>
                    <div><strong>Sentiment:</strong> {ticket.aiTriage?.sentiment || 'Neutral'}</div>
                    <div style={{ marginTop: '6px' }}>
                      <strong>Identified Root Cause:</strong> {ticket.aiTriage?.rootCause || 'Under investigation'}
                    </div>
                    <div style={{ marginTop: '4px', color: '#8E1EA2' }}>
                      <strong>AI Suggested Remediation:</strong> {ticket.aiTriage?.suggestedFix || 'Standard escalation'}
                    </div>
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '0.75rem', color: '#8E1EA2', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Touch card for complete modal inspection</span>
                    <span>→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Knowledge Base Tab */}
        {activeTab === 'knowledge' && (
          <div className="role-dashboard-container">
            <div className="section-header-row">
              <div>
                <h1 className="section-title">Campus Knowledge Base</h1>
                <p className="section-desc">Self-service guides and verified IT documentation</p>
              </div>
            </div>

            <div className="kb-full-grid">
              {KNOWLEDGE_BASE_ARTICLES.map(kb => (
                <div key={kb.id} className="kb-card">
                  <div className="kb-cat-tag">{kb.category}</div>
                  <h3 className="kb-title">{kb.title}</h3>
                  <p className="kb-desc">{kb.summary}</p>
                  <div className="kb-meta">
                    <span>👁️ {kb.views.toLocaleString()} views</span>
                    <span style={{ color: '#8E1EA2', fontWeight: 600 }}>Read Guide →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="role-dashboard-container">
            <div className="section-header-row">
              <div>
                <h1 className="section-title">AI Triage Performance & Metrics</h1>
                <p className="section-desc">Telemetry metrics on helpdesk response times and triage accuracy</p>
              </div>
            </div>

            <div className="admin-kpi-grid">
              <div className="admin-kpi-card highlight-purple">
                <div className="kpi-title">Auto-Triage Precision</div>
                <div className="admin-kpi-num">{SYSTEM_METRICS.aiAccuracy}</div>
                <div className="admin-kpi-delta positive">96.8% precision across 2,400 tickets</div>
              </div>
              <div className="admin-kpi-card">
                <div className="kpi-title">Average Time to Triage</div>
                <div className="admin-kpi-num">1.8 sec</div>
                <div className="admin-kpi-delta positive">vs 4.2 hours manual assignment</div>
              </div>
              <div className="admin-kpi-card">
                <div className="kpi-title">Overall SLA Compliance</div>
                <div className="admin-kpi-num">{SYSTEM_METRICS.slaCompliance}</div>
                <div className="admin-kpi-delta positive">Within target bounds</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* New Ticket Modal */}
      <NewTicketModal
        isOpen={isNewTicketOpen}
        onClose={() => setIsNewTicketOpen(false)}
        onAddTicket={handleAddTicket}
      />

      {/* Comprehensive Ticket Detail Modal (Opened on touching ANY ticket card) */}
      <TicketDetailModal
        isOpen={!!selectedDetailTicket}
        ticket={selectedDetailTicket}
        onClose={() => setSelectedDetailTicket(null)}
        onUpdateStatus={handleUpdateTicketStatus}
        onAddNote={handleAddTicketNote}
      />
    </div>
  );
}
