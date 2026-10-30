import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useTickets } from '../../../hooks/useTickets';
import { PageTitle } from '../../../components/shared/PageTitle';
import { MetricCard } from '../../../components/shared/MetricCard';
import { Table, Column } from '../../../components/ui/Table';
import { Pagination } from '../../../components/ui/Pagination';
import { PriorityBadge } from '../../../components/shared/PriorityBadge';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { CheckCircle2Icon } from '../../../components/ui/Icons';
import { formatTimestamp } from '../../../utils/date';
import { truncate } from '../../../utils/format';
import { Ticket } from '../../../types/ticket';
import { ArrowUpRight, Briefcase, Clock, ShieldCheck, Search } from 'lucide-react';

export const TechnicianHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: tickets, isLoading } = useTickets({
    role: 'technician',
    userId: user?.id,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const resolvedTickets = useMemo(
    () =>
      (tickets || []).filter((t) => t.status === 'Resolved' || t.status === 'Closed'),
    [tickets]
  );

  const activeTickets = useMemo(
    () => (tickets || []).filter((t) => t.status !== 'Resolved' && t.status !== 'Closed'),
    [tickets]
  );

  const filteredResolved = useMemo(
    () =>
      resolvedTickets.filter((t) => {
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
    [resolvedTickets, searchQuery]
  );

  const paginatedResolved = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredResolved.slice(start, start + pageSize);
  }, [filteredResolved, page]);

  const columns: Column<Ticket>[] = [
    {
      header: 'Ticket ID',
      cell: (t) => (
        <span style={{ fontWeight: 700, color: 'var(--color-terracotta)', fontSize: '13.5px' }}>
          {t.ticket_id}
        </span>
      ),
    },
    {
      header: 'Location & Category',
      cell: (t) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-on-light)' }}>{t.building}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-on-light-muted)' }}>{t.predicted_category}</div>
        </div>
      ),
    },
    {
      header: 'Problem Summary & Verification',
      cell: (t) => (
        <div style={{ maxWidth: '340px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-on-light)', fontWeight: 500 }}>
            {truncate(t.complaint_text, 45)}
          </div>
          {t.action_notes && (
            <div style={{ fontSize: '11.5px', color: '#16A34A', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={12} />
              <span>{truncate(t.action_notes, 40)}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Priority',
      cell: (t) => <PriorityBadge priority={t.severity} />,
    },
    {
      header: 'Status',
      cell: (t) => <StatusBadge status={t.status} />,
    },
    {
      header: 'Resolution Verified At',
      cell: (t) => (
        <span style={{ fontSize: '12.5px', color: 'var(--text-on-light-muted)' }}>
          {t.resolution_confirmed_at ? formatTimestamp(t.resolution_confirmed_at) : '—'}
        </span>
      ),
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
        >
          <span>View</span>
          <ArrowUpRight size={13} />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageTitle
        title="Personal Work History & Performance"
        subtitle="Operational track record of verified incident resolutions and complainant feedback."
      />

      <div className="metrics-grid">
        <MetricCard
          label="Active Work Orders"
          value={activeTickets.length}
          subtext="Currently assigned in queue"
          icon={<Briefcase size={17} />}
        />
        <MetricCard
          label="Completed & Verified"
          value={resolvedTickets.length}
          subtext="Lifetime confirmed resolutions"
          icon={<CheckCircle2Icon width="17" height="17" />}
        />
        <MetricCard
          label="On-Time SLA Rate"
          value="94%"
          subtext="Within target resolution windows"
          icon={<Clock size={17} />}
        />
      </div>

      <div className="table-wrapper">
        <div className="table-header-bar">
          <div>
            <h2 style={{ fontSize: '17px', color: 'var(--text-on-light)', margin: 0 }}>
              Resolved Work History ({filteredResolved.length} of {resolvedTickets.length})
            </h2>
            <p style={{ fontSize: '12.5px', color: 'var(--text-on-light-muted)', margin: '2px 0 0' }}>
              Confirmed incident resolutions signed off by complainants.
            </p>
          </div>
          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-on-light-faint)' }}
            />
            <input
              type="text"
              placeholder={`Search ${filteredResolved.length} resolutions...`}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="form-input"
              style={{ paddingLeft: '32px', width: '210px', height: '34px', fontSize: '13px' }}
            />
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <Spinner size={32} />
          </div>
        ) : resolvedTickets.length === 0 ? (
          <EmptyState
            title="No past completed tickets"
            description="Completed tickets with confirmed complainant resolution will appear here."
          />
        ) : filteredResolved.length === 0 ? (
          <EmptyState
            title="No resolutions match search"
            description="Try a different ticket ID, building or category."
          />
        ) : (
          <>
            <Table
              columns={columns}
              data={paginatedResolved}
              keyExtractor={(t) => t.ticket_id}
              onRowClick={(t) => navigate(`/technician/tickets/${t.ticket_id}`)}
            />

            <Pagination
              page={page}
              pageSize={pageSize}
              total={filteredResolved.length}
              onChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
};
