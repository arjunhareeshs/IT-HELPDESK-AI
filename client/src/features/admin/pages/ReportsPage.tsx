import React from 'react';
import { PageTitle } from '../../../components/shared/PageTitle';
import { Clock, Timer, Target, RotateCcw } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  return (
    <div>
      <PageTitle
        title="Operational Performance Reports"
        subtitle="SLA compliance, resolution turnaround metrics, and category trends."
      />

      <div className="metrics-grid-colored">
        <div className="metric-card-colored metric-card-1">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="metric-label">Average Response Time</div>
            <Clock width="18" height="18" style={{ color: 'rgba(255, 255, 255, 0.85)' }} />
          </div>
          <div className="metric-value">18 mins</div>
          <div className="metric-subtext">From triage to technician assignment</div>
        </div>

        <div className="metric-card-colored metric-card-2">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="metric-label">Average Resolution Time</div>
            <Timer width="18" height="18" style={{ color: 'rgba(255, 255, 255, 0.85)' }} />
          </div>
          <div className="metric-value">2.4 hrs</div>
          <div className="metric-subtext">Across standard priority tickets</div>
        </div>

        <div className="metric-card-colored metric-card-3">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="metric-label">SLA Compliance Rate</div>
            <Target width="18" height="18" style={{ color: 'rgba(255, 255, 255, 0.85)' }} />
          </div>
          <div className="metric-value">96.2%</div>
          <div className="metric-subtext">Met target resolution windows</div>
        </div>

        <div className="metric-card-colored metric-card-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="metric-label">Re-evaluation Rate</div>
            <RotateCcw width="18" height="18" style={{ color: 'rgba(255, 255, 255, 0.85)' }} />
          </div>
          <div className="metric-value">3.1%</div>
          <div className="metric-subtext">Complainant re-opened submissions</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="panel">
          <h2 style={{ marginBottom: '14px' }}>Incidents by Category (Last 30 Days)</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { category: 'Network Infrastructure', count: 142, percentage: 42 },
              { category: 'Software & Application License', count: 86, percentage: 26 },
              { category: 'Hardware & Workstation Faults', count: 54, percentage: 16 },
              { category: 'Account Access & Identity', count: 32, percentage: 10 },
              { category: 'Classroom AV & Peripherals', count: 20, percentage: 6 },
            ].map((item, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 500, color: 'var(--color-ink)' }}>{item.category}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{item.count} ({item.percentage}%)</span>
                </div>
                <div style={{ width: '100%', height: 6, background: 'var(--surface-muted)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${item.percentage}%`, height: '100%', background: 'var(--color-rose)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2 style={{ marginBottom: '14px' }}>Triage Policy & Escalation Distribution</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'Critical Outages (Facility / Operations)', count: 4, color: 'var(--color-rose)' },
              { label: 'High Priority (Department Floor Disruption)', count: 18, color: '#A34E59' },
              { label: 'Medium Priority (Single Office Disruption)', count: 76, color: 'var(--color-mauve)' },
              { label: 'Low Priority (Routine Tool Installation)', count: 124, color: 'var(--color-plum)' },
              { label: 'Human Review Triggered (Vague/Sparse Data)', count: 12, color: 'var(--color-ink)' },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--surface-muted)',
                  borderRadius: 'var(--radius-control)',
                  fontSize: '13px',
                }}
              >
                <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>{item.label}</span>
                <span style={{ fontWeight: 600, color: item.color }}>{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
