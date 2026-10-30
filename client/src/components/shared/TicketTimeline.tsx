import React from 'react';
import { TimelineEntry } from '../../types/ticket';
import { formatTimestamp } from '../../utils/date';
import { StatusBadge } from './StatusBadge';

export const TicketTimeline: React.FC<{ timeline?: TimelineEntry[] }> = ({ timeline }) => {
  if (!timeline || timeline.length === 0) {
    return <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No timeline events recorded.</p>;
  }

  return (
    <div className="timeline">
      {timeline.map((entry, index) => (
        <div key={index} className="timeline-item">
          <div className="timeline-dot" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <StatusBadge status={entry.status} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>
              {entry.actor}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {formatTimestamp(entry.timestamp)}
            </span>
          </div>
          {entry.note && (
            <p
              style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                marginTop: '4px',
                background: 'var(--surface-muted)',
                padding: '6px 10px',
                borderRadius: 'var(--radius-control)',
              }}
            >
              {entry.note}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};
