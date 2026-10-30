import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../../services/dashboardApi';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { useTechnicianWorkload, useTechnicianCategoryMatrix } from '../../../hooks/useDashboardStats';
import { Spinner } from '../../../components/ui/Spinner';
import { ShieldCheck } from 'lucide-react';

export const TechnicianAnalyticsView: React.FC = () => {
  const { data: workload, isLoading: loadingWorkload } = useTechnicianWorkload();
  const { data: matrix, isLoading: loadingMatrix } = useTechnicianCategoryMatrix();

  const { data: flow } = useQuery({
    queryKey: ['ticket-flow', '7d'],
    queryFn: () => dashboardApi.getTicketFlow('7d'),
  });
  const trendData = (flow || []).map((p) => ({ day: p.label, created: p.created, completed: p.resolved }));

  // Matrix columns come from the data, so every category the classifier produces is shown.
  const matrixCategories = Array.from(
    new Set((matrix || []).flatMap((row) => Object.keys(row.skills)))
  ).sort();

  if (loadingWorkload || loadingMatrix) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <Spinner size={36} />
      </div>
    );
  }

  // Flatten workload status breakdown
  const statusData = (workload || []).map((t) => ({
    name: t.name,
    assigned: t.status_breakdown.assigned,
    in_progress: t.status_breakdown.in_progress,
    waiting_user: t.status_breakdown.waiting_user,
    blocked: t.status_breakdown.blocked,
    overdue: t.status_breakdown.overdue,
  }));

  // SLA vs Rework Data
  const qualityData = (workload || []).map((t) => ({
    name: t.name,
    sla_compliance: t.sla_compliance_percent,
    rework_rate: t.rework_rate_percent,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Overview Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #11161B 0%, #1C232B 100%)',
          color: '#FFFFFF',
          padding: '20px 24px',
          borderRadius: 'var(--radius-panel)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 6px 0', color: '#FFFFFF' }}>
            Dedicated Technician Performance & Quality Analytics
          </h2>
          <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.75)', margin: 0 }}>
            Inspect workload status distribution, SLA compliance, rework rates, and verified specialty competence.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.6)' }}>Team SLA</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#34D399' }}>96.2%</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.6)' }}>Avg Rework</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#FBBF24' }}>3.5%</div>
          </div>
        </div>
      </div>

      {/* Grid: Graph A & Graph B */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
        {/* Graph A — Workload by Status */}
        <div className="panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-ink)' }}>
            Graph A · Workload by Technician and Status
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            Stacked status breakdown: Assigned, In Progress, Waiting, Blocked, Overdue
          </p>
          <div style={{ height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontWeight: 500 }} width={100} />
                <Tooltip />
                <Legend verticalAlign="top" height={26} iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="in_progress" name="In Progress" stackId="a" fill="#059669" />
                <Bar dataKey="assigned" name="Assigned" stackId="a" fill="#3B82F6" />
                <Bar dataKey="waiting_user" name="Waiting on User" stackId="a" fill="#F59E0B" />
                <Bar dataKey="blocked" name="Blocked" stackId="a" fill="#6B7280" />
                <Bar dataKey="overdue" name="Overdue" stackId="a" fill="#DC2626" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph B — SLA Compliance & Rework Rate */}
        <div className="panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-ink)' }}>
            Graph B · SLA Compliance vs. Rework Rate
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            High volume should not conceal poor resolution quality or rework loops.
          </p>
          <div style={{ height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={qualityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend verticalAlign="top" height={26} iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="sla_compliance" name="SLA Compliance %" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rework_rate" name="Rework / Reopened %" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Graph C — Technician Skill-Category Performance Heatmap Table */}
      <div className="panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--color-ink)' }}>
              Graph C · Skill-Category Performance Matrix (Heatmap)
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Compares verified success rate and median resolution hours across IT disciplines.
            </p>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            🟢 &gt;95% verified • 🟡 90-95% • 🟠 &lt;90%
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>Technician</th>
                {matrixCategories.map((cat) => (
                  <th key={cat} style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>{cat}</th>
                ))}
                <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>Overall Verified Rate</th>
              </tr>
            </thead>
            <tbody>
              {(matrix || []).map((row) => {
                const cells = Object.values(row.skills);
                const totalResolved = cells.reduce((n, c) => n + c.tickets_resolved, 0);
                const overall = totalResolved
                  ? Math.round(cells.reduce((n, c) => n + c.success_rate_percent * c.tickets_resolved, 0) / totalResolved)
                  : null;

                const renderCell = (cat: string) => {
                  const cell = row.skills[cat];
                  if (!cell) return <td key={cat} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>—</td>;
                  const isHigh = cell.success_rate_percent >= 95;
                  const bg = isHigh ? '#F0FDF4' : cell.success_rate_percent >= 90 ? '#FEFCE8' : '#FFF7ED';
                  const textCol = isHigh ? '#065F46' : cell.success_rate_percent >= 90 ? '#854D0E' : '#9A3412';
                  return (
                    <td key={cat} style={{ padding: '12px 14px', textAlign: 'center', background: bg, borderBottom: '1px solid #FFFFFF' }}>
                      <div style={{ fontWeight: 600, color: textCol }}>{cell.success_rate_percent}%</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {cell.tickets_resolved} solved • {cell.median_resolution_hours}h
                      </div>
                    </td>
                  );
                };

                return (
                  <tr key={row.technician_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--color-ink)' }}>
                      {row.name}
                    </td>
                    {matrixCategories.map(renderCell)}
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: '#ECFDF5',
                          color: '#059669',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          fontSize: '12px',
                        }}
                      >
                        <ShieldCheck size={14} /> {overall === null ? '—' : `${overall}%`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Graph D — Technician Resolution Trend */}
      <div className="panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-ink)' }}>
          Graph D · Tickets Created vs Resolved (Last 7 Days)
        </h3>
        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
          Daily intake against confirmed resolutions across all technicians.
        </p>
        <div style={{ height: '220px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend verticalAlign="top" height={26} iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              <Line yAxisId="left" type="monotone" dataKey="completed" name="Completed Tickets" stroke="#059669" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line yAxisId="left" type="monotone" dataKey="created" name="Created Tickets" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
