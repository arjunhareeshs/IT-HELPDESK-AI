import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useTickets } from '../../../hooks/useTickets';
import { PageTitle } from '../../../components/shared/PageTitle';
import { Table, Column } from '../../../components/ui/Table';
import { Pagination } from '../../../components/ui/Pagination';
import { PriorityBadge } from '../../../components/shared/PriorityBadge';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatTimestamp } from '../../../utils/date';
import { truncate } from '../../../utils/format';
import { Ticket } from '../../../types/ticket';
import { PlusCircle, ArrowUpRight, Search, RotateCcw } from 'lucide-react';
import { TicketIcon, CheckCircle2Icon, RefreshCwIcon } from '../../../components/ui/Icons';

export const MyComplaintsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: tickets, isLoading } = useTickets({
    role: 'complainant',
    userId: user?.id,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const activeCount = useMemo(
    () => (tickets || []).filter((t) => t.status !== 'Resolved' && t.status !== 'Closed').length,
    [tickets]
  );
  const verifiedCount = useMemo(
    () => (tickets || []).filter((t) => t.status === 'Awaiting verification').length,
    [tickets]
  );
  const reEvalCount = useMemo(
    () => (tickets || []).filter((t) => t.status === 'Re-evaluation').length,
    [tickets]
  );

  const filteredTickets = useMemo(
    () =>
      (tickets || []).filter((t) => {
        if (
          selectedStatus !== 'all' &&
          t.status.toLowerCase() !== selectedStatus.toLowerCase()
        )
          return false;

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
      }),
    [tickets, selectedStatus, searchQuery]
  );

  const paginatedTickets = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, page]);

  const hasFilters = selectedStatus !== 'all' || searchQuery.length > 0;

  const handleResetFilters = () => {
    setSelectedStatus('all');
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
            {formatTimestamp(t.created_at)}
          </div>
        </div>
      ),
    },
    {
      header: 'Problem Description',
      cell: (t) => (
        <div style={{ maxWidth: '320px' }}>
          <div
            style={{ fontWeight: 600, color: 'var(--text-on-light)', fontSize: '13.5px' }}
            title={t.complaint_text}
          >
            {truncate(t.complaint_text, 55)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-on-light-muted)' }}>
            Location: <strong>{t.building}</strong> • {t.predicted_category}
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
      header: 'Assessed Priority',
      cell: (t) => <PriorityBadge priority={t.severity} />,
    },
    {
      header: 'Current Status',
      cell: (t) => <StatusBadge status={t.status} />,
    },
    {
      header: 'Action',
      align: 'right',
      cell: (t) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/complainant/tickets/${t.ticket_id}`);
          }}
          className="btn btn-secondary btn-sm"
          style={{ fontSize: '12px', padding: '4px 8px' }}
        >
          <span>View Progress</span>
          <ArrowUpRight size={13} />
        </button>
      ),
    },
  ];

  const statCard = (
    cardClass: string,
    label: string,
    value: string,
    subtext: string,
    icon: React.ReactNode,
    onClick: () => void
  ) => (
    <div
      className={`metric-card-colored ${cardClass}`}
      onClick={onClick}
      title={`Click to filter: ${label}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="metric-label">{label}</div>
        <div style={{ color: 'rgba(255, 255, 255, 0.85)', display: 'flex' }}>{icon}</div>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-subtext">{subtext}</div>
    </div>
  );

  return (
    <div>
      <PageTitle
        title="My Submitted Complaints"
        subtitle="Track status, technician updates, and verify work resolutions."
        action={
          <Button variant="primary" onClick={() => navigate('/complainant/new-complaint')}>
            <PlusCircle size={16} />
            <span>New Complaint</span>
          </Button>
        }
      />

      <div className="metrics-grid-colored">
        {statCard(
          'metric-card-1',
          'Total Complaints',
          `${(tickets || []).length} Filed`,
          'All incidents submitted by you (Click to view all)',
          <TicketIcon width="18" height="18" />,
          () => {
            setSelectedStatus('all');
            setPage(1);
          }
        )}
        {statCard(
          'metric-card-3',
          'Awaiting Verification',
          `${verifiedCount} Fixed`,
          'Technician marked fixed, confirm resolution (Click to filter)',
          <CheckCircle2Icon width="18" height="18" />,
          () => {
            setSelectedStatus('awaiting verification');
            setPage(1);
          }
        )}
        {statCard(
          'metric-card-4',
          'Re-evaluation Requests',
          `${reEvalCount} Active`,
          'Of your total active incidents (Click to filter)',
          <RefreshCwIcon width="18" height="18" />,
          () => {
            setSelectedStatus('re-evaluation');
            setPage(1);
          }
        )}
      </div>

      <div className="table-wrapper">
        <div className="table-header-bar">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '18px', color: 'var(--text-on-light)', margin: 0 }}>
                Complaint History ({filteredTickets.length} of {(tickets || []).length})
              </h2>
              {hasFilters && (
                <button
                  onClick={handleResetFilters}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11.5px', padding: '2px 8px', gap: '4px' }}
                >
                  <RotateCcw size={12} />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-on-light-muted)', margin: '2px 0 0' }}>
              Active incidents in your queue: <strong>{activeCount}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-on-light-faint)' }}
              />
              <input
                type="text"
                placeholder={`Search ${filteredTickets.length} complaints...`}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="form-input"
                style={{ paddingLeft: '32px', width: '200px', height: '34px', fontSize: '13px' }}
              />
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="form-select"
              style={{ width: '170px', height: '34px', fontSize: '13px', padding: '4px 8px' }}
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="triaged">Triaged</option>
              <option value="assigned">Assigned</option>
              <option value="in progress">In Progress</option>
              <option value="awaiting verification">Awaiting Verification</option>
              <option value="re-evaluation">Re-evaluation</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <Spinner size={32} />
          </div>
        ) : !tickets || tickets.length === 0 ? (
          <EmptyState
            title="No complaints filed"
            description="You have not submitted any IT incident complaints yet."
            action={
              <Button variant="primary" onClick={() => navigate('/complainant/new-complaint')}>
                Submit Your First Complaint
              </Button>
            }
          />
        ) : filteredTickets.length === 0 ? (
          <EmptyState
            title="No complaints match filters"
            description="Adjust your search or status filter."
            action={
              <button onClick={handleResetFilters} className="btn btn-secondary btn-sm" style={{ marginTop: '8px' }}>
                Clear all filters
              </button>
            }
          />
        ) : (
          <>
            <Table
              columns={columns}
              data={paginatedTickets}
              keyExtractor={(t) => t.ticket_id}
              onRowClick={(t) => navigate(`/complainant/tickets/${t.ticket_id}`)}
            />

            <Pagination
              page={page}
              pageSize={pageSize}
              total={filteredTickets.length}
              onChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
};
