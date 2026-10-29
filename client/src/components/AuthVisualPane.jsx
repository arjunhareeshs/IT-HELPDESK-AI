import React from 'react';

/**
 * AuthVisualPane
 * The right side of the split login card directly inspired by the user's reference image.
 * Features:
 * - High-res collaborative team photo
 * - Floating "Task Review With Team" yellow card with layered dark task badge
 * - Floating glassmorphic Calendar timeline strip with diagonal hatch texture
 * - Floating "Daily Meeting" white card with overlapping team member avatars
 * - Floating team avatar bubbles with animated breathing halos
 * - Top-right close button
 */
export default function AuthVisualPane({ onClose }) {
  const calendarDays = [
    { day: 'Sun', date: 22 },
    { day: 'Mon', date: 23 },
    { day: 'Tue', date: 24 },
    { day: 'Wed', date: 25, active: true },
    { day: 'Thu', date: 26 },
    { day: 'Fri', date: 27 },
    { day: 'Sat', date: 28 }
  ];

  const teamAvatars = [
    { initials: 'AL', bg: '#8E1EA2', name: 'Amélie' },
    { initials: 'MC', bg: '#3B82F6', name: 'Marcus' },
    { initials: 'SJ', bg: '#10B981', name: 'Sarah' },
    { initials: 'ER', bg: '#F59E0B', name: 'Elena' }
  ];

  return (
    <div className="auth-visual-pane">
      {/* Background Image of Collaborative Helpdesk Team */}
      <img
        src="/team_office.jpg"
        alt="HelpDesk AI Team Collaboration"
        className="auth-visual-bg-img"
      />

      {/* Subtle Warm Vignette Overlay */}
      <div className="auth-visual-overlay" />

      {/* Top Right Close Button (matches reference design) */}
      <button
        type="button"
        className="visual-close-btn"
        onClick={onClose || (() => window.location.reload())}
        aria-label="Close"
        title="Reset demo view"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Floating Widget 1: Task Review Yellow Badge + Dark Layer */}
      <div className="floating-widget task-review-stack">
        {/* Layered dark badge behind */}
        <div className="task-badge-dark">
          <span className="task-dot-dark" />
          <span>Sprint Backlog Sync • 10:30am–11:00am</span>
        </div>

        {/* Primary yellow card */}
        <div className="task-badge-yellow">
          <div className="task-yellow-content">
            <div className="task-yellow-title">Task Review With Team</div>
            <div className="task-yellow-time">09:30am–10:00am</div>
          </div>
          <span className="task-yellow-star">★</span>
        </div>
      </div>

      {/* Floating Widget 2: Floating Avatar Circles over Team Members */}
      <div className="floating-avatar-group">
        <div className="floating-avatar-bubble bubble-1">
          <div className="avatar-inner" style={{ backgroundColor: '#8E1EA2' }}>AR</div>
          <span className="online-indicator" />
        </div>
        <div className="floating-avatar-bubble bubble-2">
          <div className="avatar-inner" style={{ backgroundColor: '#3B82F6' }}>MC</div>
          <span className="online-indicator" />
        </div>
        <div className="floating-avatar-bubble bubble-3">
          <div className="avatar-inner" style={{ backgroundColor: '#10B981' }}>SJ</div>
          <span className="online-indicator" />
        </div>
      </div>

      {/* Floating Widget 3: Translucent Frosted Glass Calendar Strip */}
      <div className="floating-widget glass-calendar-widget">
        <div className="calendar-grid">
          {calendarDays.map(item => (
            <div key={item.date} className={`calendar-col ${item.active ? 'active-col' : ''}`}>
              <div className="cal-day-name">{item.day}</div>
              <div className="cal-day-num">{item.date}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Widget 4: White Daily Meeting Card */}
      <div className="floating-widget daily-meeting-widget">
        <div className="meeting-header">
          <div className="meeting-title-row">
            <span className="meeting-title">Daily Meeting</span>
            <span className="meeting-yellow-dot" />
          </div>
          <div className="meeting-time">12:00pm–01:00pm</div>
        </div>

        {/* Overlapping Avatars */}
        <div className="meeting-avatars-row">
          {teamAvatars.map((u, i) => (
            <div
              key={u.initials}
              className="meeting-avatar-circle"
              style={{
                backgroundColor: u.bg,
                zIndex: 10 - i,
                marginLeft: i > 0 ? '-10px' : '0'
              }}
              title={u.name}
            >
              {u.initials}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
