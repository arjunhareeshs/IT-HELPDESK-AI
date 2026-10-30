import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useTechnicianWorkload } from '../../../hooks/useDashboardStats';
import { Spinner } from '../../../components/ui/Spinner';
import { Users, HelpCircle } from 'lucide-react';

interface TechnicianWorkloadChartProps {
  onSelectTechnician?: (technicianName: string) => void;
}

export const TechnicianWorkloadChart: React.FC<TechnicianWorkloadChartProps> = ({ onSelectTechnician }) => {
  const { data: workloadData, isLoading } = useTechnicianWorkload();

  return (
    <div className="panel" style={{ padding: '20px 24px', height: '100%' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>
              Graph 5 · Technician Workload vs. Output
            </h2>
            <div
              title="Workforce Management: Balances active queue load against closed incidents to avoid burnout and bottlenecks."
              style={{ cursor: 'help', color: 'var(--text-muted)', display: 'flex' }}
            >
              <HelpCircle size={15} />
            </div>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>
            Active tickets vs. completed work • Click technician bar to inspect assigned cases
          </p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '220px' }}>
          <Spinner size={28} />
        </div>
      ) : (
        <div style={{ width: '100%', height: '220px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={workloadData || []}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              onClick={(e) => {
                if (e && e.activeLabel && onSelectTechnician) {
                  onSelectTechnician(String(e.activeLabel));
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div
                        style={{
                          background: '#FFFFFF',
                          padding: '10px 14px',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          fontSize: '12px',
                        }}
                      >
                        <div style={{ fontWeight: 600, color: 'var(--color-ink)', marginBottom: '4px' }}>
                          {label} ({d.department})
                        </div>
                        <div style={{ color: '#EA580C' }}>
                          ● Active Queue Load: <strong>{d.active_tickets}</strong> tickets
                        </div>
                        <div style={{ color: '#059669', marginTop: '2px' }}>
                          ● Completed (Period): <strong>{d.completed_tickets}</strong> tickets
                        </div>
                        <div style={{ color: '#2563EB', marginTop: '2px' }}>
                          ● SLA Compliance: <strong>{d.sla_compliance_percent === null ? '—' : `${d.sla_compliance_percent}%`}</strong>
                        </div>
                        <div style={{ color: '#7C3AED', marginTop: '2px' }}>
                          ● Rework / Reopened: <strong>{d.rework_rate_percent === null ? '—' : `${d.rework_rate_percent}%`}</strong>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', borderTop: '1px solid #E2E8F0', paddingTop: '4px' }}>
                          Click bar to view technician's tickets
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend verticalAlign="top" height={26} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="active_tickets" name="Active Queue" fill="#EA580C" radius={[4, 4, 0, 0]} cursor="pointer" />
              <Bar dataKey="completed_tickets" name="Completed Output" fill="#059669" radius={[4, 4, 0, 0]} cursor="pointer" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Users size={13} />
        <span>Balanced distribution ensures critical incidents are resolved promptly without technician fatigue.</span>
      </div>
    </div>
  );
};
