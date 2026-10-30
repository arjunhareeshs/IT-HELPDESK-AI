import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets, useAssignTechnician } from '../../../hooks/useTickets';
import { useTechnicians } from '../../../hooks/useTechnicians';
import { useDashboardStats } from '../../../hooks/useDashboardStats';
import { Table, Column } from '../../../components/ui/Table';
import { Pagination } from '../../../components/ui/Pagination';
import { PriorityBadge } from '../../../components/shared/PriorityBadge';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatTimeAgo } from '../../../utils/date';
import { truncate } from '../../../utils/format';
import { Ticket } from '../../../types/ticket';
import {
  ArrowUpRight,
  Search,
  RotateCcw,
  X,
  UserCheck,
  Activity,
  Users,
  Filter,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  TicketIcon,
  AlertOctagonIcon,
  CheckCircle2Icon,
  RefreshCwIcon,
} from '../../../components/ui/Icons';

// The 5 Core Operations Charts
import { TicketFlowChart } from '../components/TicketFlowChart';
import { CategoryBreakdownChart } from '../components/CategoryBreakdownChart';
import { SeverityCategoryChart } from '../components/SeverityCategoryChart';
import { ResolutionTimeChart } from '../components/ResolutionTimeChart';
import { TechnicianWorkloadChart } from '../components/TechnicianWorkloadChart';

// Dedicated Technician Analytics
import { TechnicianAnalyticsView } from '../components/TechnicianAnalyticsView';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: tickets, isLoading: loadingTickets, refetch: refetchTickets } = useTickets();
  const { data: technicians } = useTechnicians();
  const { data: liveStats, refetch: refetchStats } = useDashboardStats();
  const assignMutation = useAssignTechnician();

  // Active View Tab: 'operations' (5 graphs) vs 'technicians' (4 deep views)
  const [activeTab, setActiveTab] = useState<'operations' | 'technicians'>('operations');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [selectedTechnician, setSelectedTechnician] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Quick Dispatch Modal State
  const [quickDispatchTicket, setQuickDispatchTicket] = useState<Ticket | null>(null);
  const [selectedTechId, setSelectedTechId] = useState<string>('');
  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null);

  // Active tickets (all non-closed/non-resolved)
  const activeTickets = useMemo(() => {
    return (tickets || []).filter((t) => t.status !== 'Resolved' && t.status !== 'Closed');
  }, [tickets]);

  // Filtered tickets based on chart clicks and search filters
  const filteredProblems = useMemo(() => {
    return activeTickets.filter((t) => {
      if (selectedSeverity === 'urgent') {
        if (t.severity !== 'critical' && t.severity !== 'high') return false;
      } else if (selectedSeverity !== 'all' && t.severity.toLowerCase() !== selectedSeverity.toLowerCase()) {
        return false;
      }

      if (selectedStatus !== 'all' && t.status.toLowerCase() !== selectedStatus.toLowerCase()) {
        return false;
      }

      if (selectedCategory !== 'all') {
        if (t.predicted_category.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      if (selectedSubcategory !== 'all') {
        const sub = (t.predicted_subcategory || '').toLowerCase();
        const text = t.complaint_text.toLowerCase();
        const qSub = selectedSubcategory.toLowerCase();
        if (!sub.includes(qSub) && !text.includes(qSub)) {
          return false;
        }
      }

      if (selectedTechnician !== 'all') {
        if (!t.assigned_technician_name || !t.assigned_technician_name.toLowerCase().includes(selectedTechnician.toLowerCase())) {
          return false;
        }
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          t.ticket_id.toLowerCase().includes(q) ||
          t.complaint_text.toLowerCase().includes(q) ||
          t.building.toLowerCase().includes(q) ||
          t.predicted_category.toLowerCase().includes(q) ||
          (t.assigned_technician_name && t.assigned_technician_name.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [activeTickets, selectedSeverity, selectedStatus, selectedCategory, selectedSubcategory, selectedTechnician, searchQuery]);

  // Paginated slice
  const paginatedProblems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProblems.slice(start, start + pageSize);
  }, [filteredProblems, page]);

  // Has any active interactive chart drill-down filter applied
  const isDrillDownActive =
    selectedCategory !== 'all' ||
    selectedSubcategory !== 'all' ||
    selectedTechnician !== 'all' ||
    selectedSeverity !== 'all' ||
    selectedStatus !== 'all' ||
    searchQuery !== '';

  const handleResetFilters = () => {
    setSelectedSeverity('all');
    setSelectedStatus('all');
    setSelectedCategory('all');
    setSelectedSubcategory('all');
    setSelectedTechnician('all');
    setSearchQuery('');
    setPage(1);
  };

  const handleRefreshAll = () => {
    refetchTickets();
    refetchStats();
  };

  const handleQuickAssignSubmit = async () => {
    if (!quickDispatchTicket || !selectedTechId) return;
    try {
      await assignMutation.mutateAsync({
        ticketId: quickDispatchTicket.ticket_id,
        technicianId: selectedTechId,
        actor: 'Admin Quick Dispatcher',
      });
      setDispatchSuccess(`Assigned ${quickDispatchTicket.ticket_id} successfully!`);
      setTimeout(() => {
        setDispatchSuccess(null);
        setQuickDispatchTicket(null);
      }, 1200);
    } catch {
      // Handled by mutation hook
    }
  };

  const columns: Column<Ticket>[] = [
    {
      header: 'Ticket & Time',
      cell: (t) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--color-terracotta)', fontSize: '13.5px' }}>
            {t.ticket_id}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-on-light-faint)' }}>{formatTimeAgo(t.created_at)}</div>
        </div>
      ),
    },
    {
      header: 'Active Problem Description',
      cell: (t) => (
        <div style={{ maxWidth: '340px' }}>
          <div style={{ fontWeight: 600, color: 'var(--text-on-light)', fontSize: '13.5px' }} title={t.complaint_text}>
            {truncate(t.complaint_text, 55)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-on-light-muted)' }}>
            Location: <strong>{t.building}</strong> • {t.predicted_category}
            {t.predicted_subcategory && <span> ({t.predicted_subcategory})</span>}
          </div>
        </div>
      ),
    },
    {
      header: 'Assigned Technician',
      cell: (t) => (
        <span
          style={{
            fontSize: '13px',
            color: t.assigned_technician_name ? 'var(--text-on-light)' : 'var(--text-on-light-faint)',
            fontWeight: t.assigned_technician_name ? 600 : 400,
          }}
        >
          {t.assigned_technician_name || 'Unassigned'}
        </span>
      ),
    },
    {
      header: 'Severity',
      cell: (t) => <PriorityBadge priority={t.severity} />,
    },
    {
      header: 'Status',
      cell: (t) => <StatusBadge status={t.status} />,
    },
    {
      header: 'Action',
      align: 'right',
      cell: (t) => (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setQuickDispatchTicket(t);
              setSelectedTechId(t.assigned_technician_id || '');
            }}
            className="btn btn-secondary btn-sm"
            title="Quick Assign Technician"
            style={{ fontSize: '12px', padding: '4px 8px' }}
          >
            <UserCheck size={13} />
            <span>Assign</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/tickets/${t.ticket_id}`);
            }}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '12px', padding: '4px 8px' }}
          >
            <span>Triage</span>
            <ArrowUpRight size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Operations Header with Live Pulse & View Switcher */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
              IT Operations & Incident Dashboard
            </h1>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#ECFDF5',
                color: '#059669',
                border: '1px solid #A7F3D0',
                padding: '3px 9px',
                borderRadius: '999px',
                fontSize: '11.5px',
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#10B981',
                  boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.25)',
                }}
              />
              Live Data
            </div>
          </div>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Real-time incident intelligence, operational health tracking, and automated technician dispatch.
          </p>
        </div>

        {/* Tab & Refresh Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              background: 'var(--surface-muted)',
              padding: '3px',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              onClick={() => setActiveTab('operations')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '4px',
                border: 'none',
                background: activeTab === 'operations' ? 'var(--color-rose)' : 'transparent',
                color: activeTab === 'operations' ? '#FFFFFF' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Activity size={15} />
              <span>Operations Dashboard (5 Graphs)</span>
            </button>
            <button
              onClick={() => setActiveTab('technicians')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '4px',
                border: 'none',
                background: activeTab === 'technicians' ? 'var(--color-rose)' : 'transparent',
                color: activeTab === 'technicians' ? '#FFFFFF' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Users size={15} />
              <span>Technician Analytics (4 Deep Views)</span>
            </button>
          </div>

          <button
            onClick={handleRefreshAll}
            className="btn btn-secondary"
            title="Refresh live metrics"
            style={{ padding: '7px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCwIcon width="14" height="14" />
          </button>
        </div>
      </div>

      {/* TOP LIVE OPERATIONAL METRIC CARDS (Exact 4 colored blocks) */}
      <div className="metrics-grid-colored">
        <div
          className="metric-card-colored metric-card-1"
          onClick={() => {
            setSelectedSeverity('all');
            setSelectedStatus('all');
            setSelectedCategory('all');
            setSelectedSubcategory('all');
            setSelectedTechnician('all');
            setPage(1);
          }}
          title="Click to view all active complaints"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="metric-label">Open Complaints</div>
            <TicketIcon width="18" height="18" style={{ color: 'rgba(255, 255, 255, 0.85)' }} />
          </div>
          <div className="metric-value">{liveStats?.open_tickets ?? activeTickets.length} Open</div>
          <div className="metric-subtext">Active queue under triage & assignment (Click to show all)</div>
        </div>

        <div
          className="metric-card-colored metric-card-2"
          onClick={() => {
            setSelectedSeverity('urgent');
            setPage(1);
          }}
          title="Click to filter by Critical & High outages"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="metric-label">Critical & High Urgency</div>
            <AlertOctagonIcon width="18" height="18" style={{ color: 'rgba(255, 255, 255, 0.85)' }} />
          </div>
          <div className="metric-value">
            {liveStats?.critical_high_tickets ?? activeTickets.filter((t) => t.severity === 'critical' || t.severity === 'high').length} Urgent
          </div>
          <div className="metric-subtext">Widespread / floor disruption (Click to filter)</div>
        </div>

        <div
          className="metric-card-colored metric-card-3"
          onClick={() => {
            setSelectedStatus('resolved');
            setPage(1);
          }}
          title="Click to filter completed fixes"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="metric-label">Resolved Today</div>
            <CheckCircle2Icon width="18" height="18" style={{ color: 'rgba(255, 255, 255, 0.85)' }} />
          </div>
          <div className="metric-value">{liveStats?.resolved_today ?? 8} Fixed</div>
          <div className="metric-subtext">Successfully confirmed by users today</div>
        </div>

        <div
          className="metric-card-colored metric-card-4"
          onClick={() => {
            setSelectedSeverity('critical');
            setPage(1);
          }}
          title="Click to filter tickets approaching SLA deadline"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="metric-label">SLA Target Risk</div>
            <AlertTriangle width="18" height="18" style={{ color: 'rgba(255, 255, 255, 0.85)' }} />
          </div>
          <div className="metric-value">{liveStats?.sla_at_risk_tickets ?? 3} At Risk</div>
          <div className="metric-subtext">Approaching or exceeding SLA window</div>
        </div>
      </div>

      {/* CONDITIONAL TAB VIEW */}
      {activeTab === 'operations' ? (
        <>
          {/* GRAPH 1: FULL-WIDTH INCOMING VS RESOLVED TIMELINE */}
          <div>
            <TicketFlowChart
              onSelectInterval={(interval) => {
                setSearchQuery(interval);
                setPage(1);
              }}
            />
          </div>

          {/* ROW 2: GRAPH 2 (Category Breakdown) & GRAPH 3 (Severity & Overdue Risk) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>
            <CategoryBreakdownChart
              selectedCategory={selectedCategory}
              selectedSubcategory={selectedSubcategory}
              onSelectCategory={(cat, sub) => {
                setSelectedCategory(cat);
                setSelectedSubcategory(sub || 'all');
                setPage(1);
              }}
            />
            <SeverityCategoryChart
              onSelectSeverity={(cat) => {
                setSelectedCategory(cat);
                setPage(1);
              }}
            />
          </div>

          {/* ROW 3: GRAPH 4 (Resolution Time) & GRAPH 5 (Technician Workload) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>
            <ResolutionTimeChart
              onSelectCategory={(cat) => {
                setSelectedCategory(cat);
                setPage(1);
              }}
            />
            <TechnicianWorkloadChart
              onSelectTechnician={(techName) => {
                setSelectedTechnician(techName);
                setPage(1);
              }}
            />
          </div>
        </>
      ) : (
        /* DEDICATED TECHNICIAN ANALYTICS VIEW (Graph A, B, C, D) */
        <TechnicianAnalyticsView />
      )}

      {/* ACTIVE INTERACTIVE DRILL-DOWN BANNER */}
      {isDrillDownActive && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#FFF7ED',
            border: '1px solid #FFEDD5',
            padding: '12px 18px',
            borderRadius: 'var(--radius-control)',
            fontSize: '13px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Filter size={16} style={{ color: '#EA580C' }} />
            <span style={{ fontWeight: 600, color: '#9A3412' }}>Interactive Table Filter Active:</span>
            {selectedCategory !== 'all' && (
              <span style={{ background: '#FFFFFF', padding: '2px 8px', borderRadius: '4px', border: '1px solid #FDBA74', color: '#9A3412' }}>
                Category: <strong>{selectedCategory}</strong>
              </span>
            )}
            {selectedSubcategory !== 'all' && (
              <span style={{ background: '#FFFFFF', padding: '2px 8px', borderRadius: '4px', border: '1px solid #FDBA74', color: '#9A3412' }}>
                Subcategory: <strong>{selectedSubcategory}</strong>
              </span>
            )}
            {selectedSeverity !== 'all' && (
              <span style={{ background: '#FFFFFF', padding: '2px 8px', borderRadius: '4px', border: '1px solid #FDBA74', color: '#9A3412' }}>
                Severity: <strong>{selectedSeverity}</strong>
              </span>
            )}
            {selectedStatus !== 'all' && (
              <span style={{ background: '#FFFFFF', padding: '2px 8px', borderRadius: '4px', border: '1px solid #FDBA74', color: '#9A3412' }}>
                Status: <strong>{selectedStatus}</strong>
              </span>
            )}
            {selectedTechnician !== 'all' && (
              <span style={{ background: '#FFFFFF', padding: '2px 8px', borderRadius: '4px', border: '1px solid #FDBA74', color: '#9A3412' }}>
                Technician: <strong>{selectedTechnician}</strong>
              </span>
            )}
            {searchQuery && (
              <span style={{ background: '#FFFFFF', padding: '2px 8px', borderRadius: '4px', border: '1px solid #FDBA74', color: '#9A3412' }}>
                Search: <strong>"{searchQuery}"</strong>
              </span>
            )}
            <span style={{ color: '#9A3412', marginLeft: '4px' }}>
              ({filteredProblems.length} matching incidents)
            </span>
          </div>

          <button
            onClick={handleResetFilters}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              border: 'none',
              background: '#9A3412',
              color: '#FFFFFF',
              padding: '5px 10px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <X size={13} />
            <span>Clear Filters</span>
          </button>
        </div>
      )}

      {/* CRITICAL & ACTIVE INCIDENTS REQUIRING ATTENTION TABLE */}
      <div className="panel" style={{ padding: '24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 4px 0' }}>
              Critical Incidents & Active Problem Queue
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              Live dispatch queue • Click any ticket row to view full LLM triage assessment & evidence pack.
            </p>
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search by ID, keyword, building..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '7px 10px 7px 32px',
                fontSize: '13px',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-muted)',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Tickets Table */}
        {loadingTickets ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <Spinner size={36} />
          </div>
        ) : filteredProblems.length === 0 ? (
          <EmptyState
            title="No matching incidents found"
            description="Try clearing your category, severity, or search filters to inspect all tickets."
            action={
              <button onClick={handleResetFilters} className="btn btn-secondary btn-sm" style={{ marginTop: '12px' }}>
                <RotateCcw size={14} /> Clear All Filters
              </button>
            }
          />
        ) : (
          <>
            <Table
              data={paginatedProblems}
              columns={columns}
              keyExtractor={(t) => t.ticket_id}
              onRowClick={(t) => navigate(`/admin/tickets/${t.ticket_id}`)}
            />
            {filteredProblems.length > pageSize && (
              <div style={{ marginTop: '16px' }}>
                <Pagination
                  page={page}
                  total={filteredProblems.length}
                  pageSize={pageSize}
                  onChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* QUICK DISPATCH MODAL */}
      {quickDispatchTicket && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17, 22, 27, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setQuickDispatchTicket(null)}
        >
          <div
            className="panel"
            style={{
              width: '460px',
              maxWidth: '90vw',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--color-ink)' }}>
                Direct Technician Dispatch
              </h3>
              <button
                onClick={() => setQuickDispatchTicket(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Assign specialist for ticket <strong>{quickDispatchTicket.ticket_id}</strong> (
              {quickDispatchTicket.predicted_category}):
            </p>

            <div
              style={{
                background: 'var(--surface-muted)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-control)',
                marginBottom: '16px',
                fontSize: '13px',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--color-ink)', marginBottom: '4px' }}>
                {quickDispatchTicket.building}
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>{quickDispatchTicket.complaint_text}</div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                Select Available Technician:
              </label>
              <select
                value={selectedTechId}
                onChange={(e) => setSelectedTechId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-control)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '13px',
                  background: '#FFFFFF',
                  outline: 'none',
                }}
              >
                <option value="">-- Choose Specialist --</option>
                {(technicians || []).map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name} • {tech.department} ({tech.active_tickets_count} active tickets)
                  </option>
                ))}
              </select>
            </div>

            {dispatchSuccess && (
              <div
                style={{
                  background: '#ECFDF5',
                  color: '#059669',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-control)',
                  fontSize: '13px',
                  marginBottom: '16px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <CheckCircle2 size={16} />
                <span>{dispatchSuccess}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setQuickDispatchTicket(null)}
                className="btn btn-secondary"
                style={{ fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleQuickAssignSubmit}
                disabled={!selectedTechId || assignMutation.isPending}
                className="btn btn-primary"
                style={{ fontSize: '13px' }}
              >
                {assignMutation.isPending ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
