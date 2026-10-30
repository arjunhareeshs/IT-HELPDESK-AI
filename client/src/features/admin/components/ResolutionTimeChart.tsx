import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { useResolutionTime } from '../../../hooks/useDashboardStats';
import { Spinner } from '../../../components/ui/Spinner';
import { Timer, HelpCircle } from 'lucide-react';

interface ResolutionTimeChartProps {
  onSelectCategory?: (category: string) => void;
}

export const ResolutionTimeChart: React.FC<ResolutionTimeChartProps> = ({ onSelectCategory }) => {
  const { data: resolutionData, isLoading } = useResolutionTime();

  return (
    <div className="panel" style={{ padding: '20px 24px', height: '100%' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>
              Graph 4 · Median Resolution Time
            </h2>
            <div
              title="Efficiency Analysis: Shows median resolution time (in hours) broken down into active troubleshooting vs. user waiting time."
              style={{ cursor: 'help', color: 'var(--text-muted)', display: 'flex' }}
            >
              <HelpCircle size={15} />
            </div>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>
            Active work vs. waiting for user confirmation (Hours)
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
              data={resolutionData || []}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 30, bottom: 5 }}
              onClick={(e) => {
                if (e && e.activeLabel && onSelectCategory) {
                  onSelectCategory(String(e.activeLabel));
                }
              }}
            >
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} unit="h" />
              <YAxis
                type="category"
                dataKey="category"
                tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                width={110}
              />
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
                          {label}
                        </div>
                        <div style={{ color: 'var(--color-ink)' }}>
                          Total Median: <strong>{d.median_hours}h</strong>
                        </div>
                        <div style={{ color: '#059669', marginTop: '2px' }}>
                          ● Active Hands-On Work: <strong>{d.active_work_hours}h</strong>
                        </div>
                        <div style={{ color: '#D97706', marginTop: '2px' }}>
                          ● Waiting on User/Parts: <strong>{d.waiting_hours}h</strong>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', borderTop: '1px solid #E2E8F0', paddingTop: '4px' }}>
                          Sample: {d.ticket_count} cases analyzed
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend verticalAlign="top" height={26} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="active_work_hours" name="Active Work" stackId="a" fill="#059669" radius={[0, 0, 0, 0]} cursor="pointer" />
              <Bar dataKey="waiting_hours" name="Waiting on User" stackId="a" fill="#F59E0B" radius={[0, 4, 4, 0]} cursor="pointer" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Timer size={13} />
        <span>Median time is used rather than average to avoid distortion from long-pending edge cases.</span>
      </div>
    </div>
  );
};
