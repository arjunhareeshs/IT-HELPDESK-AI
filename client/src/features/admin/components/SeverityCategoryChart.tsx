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
import { useSeverityByCategory } from '../../../hooks/useDashboardStats';
import { Spinner } from '../../../components/ui/Spinner';
import { AlertTriangle, HelpCircle } from 'lucide-react';

interface SeverityCategoryChartProps {
  onSelectSeverity?: (category: string, severity?: string) => void;
}

export const SeverityCategoryChart: React.FC<SeverityCategoryChartProps> = ({ onSelectSeverity }) => {
  const { data: severityData, isLoading } = useSeverityByCategory();

  const totalOverdue = severityData ? severityData.reduce((acc, item) => acc + item.overdue, 0) : 0;

  return (
    <div className="panel" style={{ padding: '20px 24px', height: '100%' }}>
      {/* Title & SLA at-risk callout */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>
              Graph 3 · Severity & Overdue Risk
            </h2>
            <div
              title="Risk Analysis: Stacked distribution of Critical, High, Medium, and Low tickets. Highlights SLA deadline risks."
              style={{ cursor: 'help', color: 'var(--text-muted)', display: 'flex' }}
            >
              <HelpCircle size={15} />
            </div>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>
            Categorical urgency breakdown • Prioritize high impact risk
          </p>
        </div>

        {/* Overdue badge indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: totalOverdue > 0 ? '#FEF2F2' : '#F0FDF4',
            color: totalOverdue > 0 ? '#DC2626' : '#059669',
            padding: '4px 10px',
            borderRadius: 'var(--radius-control)',
            border: `1px solid ${totalOverdue > 0 ? '#FECACA' : '#BBF7D0'}`,
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={14} />
          <span>{totalOverdue} Overdue / SLA-at-Risk</span>
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
              data={severityData || []}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              onClick={(e) => {
                if (e && e.activeLabel && onSelectSeverity) {
                  onSelectSeverity(String(e.activeLabel));
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
              <XAxis dataKey="category" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
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
                        <div style={{ fontWeight: 600, color: 'var(--color-ink)', marginBottom: '6px' }}>
                          Category: {label}
                        </div>
                        <div style={{ color: '#DC2626' }}>● Critical: <strong>{d.critical}</strong></div>
                        <div style={{ color: '#EA580C' }}>● High: <strong>{d.high}</strong></div>
                        <div style={{ color: '#D97706' }}>● Medium: <strong>{d.medium}</strong></div>
                        <div style={{ color: '#2563EB' }}>● Low: <strong>{d.low}</strong></div>
                        {d.overdue > 0 && (
                          <div style={{ color: '#DC2626', fontWeight: 600, marginTop: '4px', borderTop: '1px solid #FEE2E2', paddingTop: '4px' }}>
                            ⚠️ {d.overdue} SLA Deadline Breached
                          </div>
                        )}
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', borderTop: '1px solid #E2E8F0', paddingTop: '4px' }}>
                          Click bar to inspect incidents
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend verticalAlign="top" height={26} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="critical" name="Critical (P1)" stackId="a" fill="#DC2626" radius={[0, 0, 0, 0]} cursor="pointer" />
              <Bar dataKey="high" name="High (P2)" stackId="a" fill="#EA580C" radius={[0, 0, 0, 0]} cursor="pointer" />
              <Bar dataKey="medium" name="Medium (P3)" stackId="a" fill="#D97706" radius={[0, 0, 0, 0]} cursor="pointer" />
              <Bar dataKey="low" name="Low (P4)" stackId="a" fill="#2563EB" radius={[4, 4, 0, 0]} cursor="pointer" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
