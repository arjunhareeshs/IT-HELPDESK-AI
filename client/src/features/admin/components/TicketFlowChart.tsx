import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useTicketFlow } from '../../../hooks/useDashboardStats';
import { Spinner } from '../../../components/ui/Spinner';
import { TrendingUp, TrendingDown, HelpCircle } from 'lucide-react';

interface TicketFlowChartProps {
  onSelectInterval?: (interval: string) => void;
}

export const TicketFlowChart: React.FC<TicketFlowChartProps> = ({ onSelectInterval }) => {
  const [period, setPeriod] = useState<string>('today');
  const { data: flowData, isLoading } = useTicketFlow(period);

  const totalCreated = flowData ? flowData.reduce((acc, p) => acc + p.created, 0) : 0;
  const totalResolved = flowData ? flowData.reduce((acc, p) => acc + p.resolved, 0) : 0;
  const netDifference = totalCreated - totalResolved;
  const isBacklogGrowing = netDifference > 0;

  return (
    <div className="panel" style={{ padding: '20px 24px', height: '100%' }}>
      {/* Header with Title, Period Switcher & Insight */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>
              Graph 1 · Incoming vs. Resolved Tickets
            </h2>
            <div
              title="Operational Health: Tracks if incoming complaints are outpacing resolved issues or if backlog is decreasing."
              style={{ cursor: 'help', color: 'var(--text-muted)', display: 'flex' }}
            >
              <HelpCircle size={15} />
            </div>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>
            Operational health timeline • Click any point to filter matching incidents
          </p>
        </div>

        {/* Period Selector Pills */}
        <div
          style={{
            display: 'flex',
            background: 'var(--surface-muted)',
            padding: '3px',
            borderRadius: 'var(--radius-control)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {[
            { id: 'hour', label: 'Last Hour' },
            { id: 'today', label: 'Today' },
            { id: '7d', label: '7 Days' },
            { id: '30d', label: '30 Days' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPeriod(item.id)}
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '4px',
                border: 'none',
                background: period === item.id ? 'var(--color-rose)' : 'transparent',
                color: period === item.id ? '#FFFFFF' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Operational Verdict Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '8px 14px',
          background: isBacklogGrowing ? '#FEF2F2' : '#F0FDF4',
          borderRadius: 'var(--radius-control)',
          border: `1px solid ${isBacklogGrowing ? '#FECACA' : '#BBF7D0'}`,
          marginBottom: '16px',
          fontSize: '12.5px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
          {isBacklogGrowing ? (
            <span style={{ color: '#DC2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrendingUp size={16} /> Backlog Growing: +{netDifference} Tickets
            </span>
          ) : (
            <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrendingDown size={16} /> Stable Clearance: {Math.abs(netDifference)} Resolved Surplus
            </span>
          )}
        </div>
        <div style={{ color: 'var(--text-secondary)', marginLeft: 'auto', display: 'flex', gap: '14px' }}>
          <span>Created: <strong>{totalCreated}</strong></span>
          <span>Resolved: <strong>{totalResolved}</strong></span>
        </div>
      </div>

      {/* Chart Display */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '240px' }}>
          <Spinner size={30} />
        </div>
      ) : (
        <div style={{ width: '100%', height: '240px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={flowData || []}
              onClick={(e) => {
                if (e && e.activeLabel && onSelectInterval) {
                  onSelectInterval(String(e.activeLabel));
                }
              }}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EB4D28" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#EB4D28" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
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
                        <div style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--color-ink)' }}>
                          Timeframe: {label}
                        </div>
                        <div style={{ color: '#EB4D28', marginBottom: '2px' }}>
                          ● Created Complaints: <strong>{payload[0]?.value}</strong>
                        </div>
                        <div style={{ color: '#059669', marginBottom: '4px' }}>
                          ● Resolved Requests: <strong>{payload[1]?.value}</strong>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid #E2E8F0', paddingTop: '4px', marginTop: '4px' }}>
                          Click point to filter table incidents
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend verticalAlign="top" height={28} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
              <Area
                type="monotone"
                dataKey="created"
                name="Created Complaints"
                stroke="#EB4D28"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorCreated)"
                cursor="pointer"
              />
              <Area
                type="monotone"
                dataKey="resolved"
                name="Resolved Issues"
                stroke="#059669"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorResolved)"
                cursor="pointer"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
