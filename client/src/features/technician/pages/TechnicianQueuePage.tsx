import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useTickets } from '../../../hooks/useTickets';
import { compareByPriority } from '../../../utils/ticketOrder';
import { PageTitle } from '../../../components/shared/PageTitle';
import { Table, Column } from '../../../components/ui/Table';
import { Pagination } from '../../../components/ui/Pagination';
import { PriorityBadge } from '../../../components/shared/PriorityBadge';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatTimeAgo } from '../../../utils/date';
import { truncate } from '../../../utils/format';
import { Ticket } from '../../../types/ticket';
import { Wrench, Search, RotateCcw, AlertOctagon, Briefcase, Clock, Image as ImageIcon } from 'lucide-react';
import { CheckCircle2Icon } from '../../../components/ui/Icons';

export const TechnicianQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: tickets, isLoading } = useTickets({
    role: 'technician',
    userId: user?.id,
  });

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const activeTickets = useMemo(
    () => (tickets || []).filter((t) => t.status !== 'Resolved' && t.status !== 'Closed'),
    [tickets]
  );

  const queue = useMemo(
    () =>
      activeTickets
        .filter((t) => (statusFilter === 'all' ? true : t.status.toLowerCase() === statusFilter.toLowerCase()))
        .filter((t) => {
          if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const match =
              t.ticket_id.toLowerCase().includes(q) ||
              t.complaint_text.toLowerCase().includes(q) ||
              t.building.toLowerCase().includes(q) ||
              t.predicted_category.toLowerCase().includes(q);
            if (!match) return false;
          }
          return true;
        })
        .sort(compareByPriority),
    [activeTickets, statusFilter, searchQuery]
  );

  const urgentCount = useMemo(
    () => activeTickets.filter((t) => t.severity === 'critical' || t.severity === 'high').length,
    [activeTickets]
  );
  const inProgressCount = useMemo(
    () => activeTickets.filter((t) => t.status.toLowerCase() === 'in progress').length,
    [activeTickets]
  );
  const awaitingCount = useMemo(
    () => activeTickets.filter((t) => t.status === 'Awaiting verification').length,
    [activeTickets]
  );

  const hasFilters = statusFilter !== 'all' || searchQuery.length > 0;

  const handleResetFilters = () => {
    setStatusFilter('all');
    setSearchQuery('');
    setPage(1);
  };

  const columns: Column<Ticket>[] = [
    {
      header: 'Ticket & Time',
      cell: (t) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--color-terracotta)', fontSize: '13.5px' }}>
            {t.ticket_id}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-on-light-faint)' }}>
            {formatTimeAgo(t.created_at)}
          </div>
        </div>
      ),
    },
    {
      header: 'Problem Description',
      cell: (t) => {
        const hasImg = t.attachments?.some(
          (a) => a.mime_type?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(a.name)
        );
        return (
          <div style={{ maxWidth: '320px' }}>
            <div
              style={{ fontWeight: 600, color: 'var(--text-on-light)', fontSize: '13.5px' }}
              title={t.complaint_text}
            >
              {truncate(t.complaint_text, 55)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-on-light-muted)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
              <span>Location: <strong>{t.building}</strong> • {t.predicted_category}</span>
              {hasImg && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--color-plum)',
                    background: 'var(--surface-page-subtle)',
                    border: '1px solid var(--border-subtle)',
                    padding: '1px 6px',
                    borderRadius: '4px',
                  }}
                  title="Reference photo attached for technician review"
                >
                  <ImageIcon size={11} /> Photo Attached
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Assessed Priority',
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
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/technician/tickets/${t.ticket_id}`);
          }}
          className="btn btn-secondary btn-sm"
          style={{ fontSize: '12px', padding: '4px 8px' }}
        >
          <Wrench size={13} />
          <span>Work Ticket</span>
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageTitle
        title="Assigned Work Queue"
        subtitle="Active work orders assigned to you, organized by incident severity."
      />

      {/* Work Queue Stat Cards */}
      <div className="metrics-grid-colored">
        <div
          className="metric-card-colored metric-card-1"
          onClick={() => {
            setStatusFilter('all');
            setPage(1);
          }}
          title="Click to view entire work queue"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="metric-label">Assigned Work Orders</div>
            <Briefcase width="18" height="18" style={{ color: 'rgba(255, 255, 255, 0.85)' }} />
          </div>
          <div className="metric-value">{activeTickets.length} Active</div>
          <div className="metric-subtext">Priority-sorted dispatch list (Click to view all)</div>
        </div>

        <div
          className="metric-card-colored metric-card-2"
          onClick={() => {
            setStatusFilter('all');
            setPage(1);
          }}
          title="Critical & high severity jobs"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="metric-label">Urgent Jobs</div>
            <AlertOctagon width="18" height="18" style={{ color: 'rgba(255, 255, 255, 0.85)' }} />
          </div>
          <div className="metric-value">{urgentCount} Urgent</div>
          <div className="metric-subtext">Critical & high severity at top of queue</div>
        </div>

        <div
          className="metric-card-colored metric-card-3"
          onClick={() => {
            setStatusFilter('awaiting verification');
            setPage(1);
          }}
          title="Click to filter: awaiting verification"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="metric-label">Awaiting Verification</div>
            <CheckCircle2Icon width="18" height="18" style={{ color: 'rgba(255, 255, 255, 0.85)' }} />
          </div>
          <div className="metric-value">{awaitingCount} Fixed</div>
          <div className="metric-subtext">Marked fixed, pending complainant sign-off (Click to filter)</div>
        </div>

        <div
          className="metric-card-colored metric-card-4"
          onClick={() => {
            setStatusFilter('in progress');
            setPage(1);
          }}
          title="Click to filter: in progress"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="metric-label">Work In Progress</div>
            <Clock width="18" height="18" style={{ color: 'rgba(255, 255, 255, 0.85)' }} />
          </div>
          <div className="metric-value">{inProgressCount} Ongoing</div>
          <div className="metric-subtext">Currently being resolved on-site (Click to filter)</div>
        </div>
      </div>

      <div className="table-wrapper">
        <div className="table-header-bar">
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Active' },
              { id: 'in progress', label: 'In Progress' },
              { id: 'awaiting verification', label: 'Awaiting Verification' },
              { id: 're-evaluation', label: 'Re-evaluation' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-control)',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor: statusFilter === tab.id ? 'var(--color-terracotta)' : 'var(--border-subtle)',
                  background: statusFilter === tab.id ? 'var(--color-terracotta)' : 'var(--surface-panel)',
                  color: statusFilter === tab.id ? '#FFFFFF' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-on-light-faint)' }}
              />
              <input
                type="text"
                placeholder={`Search ${queue.length} jobs...`}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="form-input"
                style={{ paddingLeft: '32px', width: '200px', height: '34px', fontSize: '13px' }}
              />
            </div>
            {hasFilters && (
              <button
                onClick={handleResetFilters}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11.5px', padding: '4px 8px', gap: '4px' }}
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <Spinner size={32} />
          </div>
        ) : queue.length === 0 ? (
          <EmptyState
            title="Queue Empty"
            description="You have no active work orders pending action in this category."
          />
        ) : (
          <>
            <Table
              columns={columns}
              data={queue.slice((page - 1) * pageSize, page * pageSize)}
              keyExtractor={(t) => t.ticket_id}
              onRowClick={(t) => navigate(`/technician/tickets/${t.ticket_id}`)}
            />

            <Pagination page={page} pageSize={pageSize} total={queue.length} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
};
