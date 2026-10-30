import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '../../../hooks/useTickets';
import { PageTitle } from '../../../components/shared/PageTitle';
import { Table, Column } from '../../../components/ui/Table';
import { Pagination } from '../../../components/ui/Pagination';
import { PriorityBadge } from '../../../components/shared/PriorityBadge';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatTimestamp } from '../../../utils/date';
import { truncate } from '../../../utils/format';
import { Ticket } from '../../../types/ticket';
import { ArrowUpRight, Search, RotateCcw } from 'lucide-react';

type TabId = 'all' | 'ongoing' | 'verification' | 'reevaluation' | 'resolved';

export const RegistryPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const { data: tickets, isLoading } = useTickets();

  const counts = useMemo(() => {
    const all = tickets || [];
    return {
      all: all.length,
      ongoing: all.filter((t) => t.status !== 'Resolved' && t.status !== 'Closed').length,
      verification: all.filter((t) => t.status === 'Awaiting verification').length,
      reevaluation: all.filter((t) => t.status === 'Re-evaluation').length,
      resolved: all.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length,
    };
  }, [tickets]);

  const filteredTickets = useMemo(
    () =>
      (tickets || []).filter((t) => {
        if (activeTab === 'ongoing' && (t.status === 'Resolved' || t.status === 'Closed')) return false;
        if (activeTab === 'verification' && t.status !== 'Awaiting verification') return false;
        if (activeTab === 'reevaluation' && t.status !== 'Re-evaluation') return false;
        if (activeTab === 'resolved' && t.status !== 'Resolved' && t.status !== 'Closed') return false;

        if (selectedPriority !== 'all' && t.severity.toLowerCase() !== selectedPriority.toLowerCase())
          return false;

        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const match =
            t.ticket_id.toLowerCase().includes(q) ||
            t.complaint_text.toLowerCase().includes(q) ||
            t.building.toLowerCase().includes(q) ||
            t.complainant_name.toLowerCase().includes(q) ||
            t.predicted_category.toLowerCase().includes(q);
          if (!match) return false;
        }

        return true;
      }),
    [tickets, activeTab, selectedPriority, searchQuery]
  );

  const paginatedTickets = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, page]);

  const hasFilters = activeTab !== 'all' || selectedPriority !== 'all' || searchQuery.length > 0;

  const handleResetFilters = () => {
    setActiveTab('all');
    setSelectedPriority('all');
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
        <div style={{ maxWidth: '300px' }}>
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
      header: 'Complainant',
      cell: (t) => (
        <span style={{ fontSize: '13px', color: 'var(--text-on-light)' }}>{t.complainant_name}</span>
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
      header: 'Action',
      align: 'right',
      cell: (t) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/admin/tickets/${t.ticket_id}`);
          }}
          className="btn btn-secondary btn-sm"
          style={{ fontSize: '12px', padding: '4px 8px' }}
        >
          <span>View</span>
          <ArrowUpRight size={13} />
        </button>
      ),
    },
  ];

  const tabStat = (id: TabId, label: string, count: number) => (
    <div
      key={id}
      onClick={() => {
        setActiveTab(id);
        setPage(1);
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        padding: '10px 14px',
        borderRadius: 'var(--radius-control)',
        background: activeTab === id ? 'var(--color-terracotta)' : 'var(--surface-panel)',
        border: `1px solid ${activeTab === id ? 'var(--color-terracotta)' : 'var(--border-subtle)'}`,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
      title={`Filter registry by ${label}`}
    >
      <span
        style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          fontWeight: 700,
          color: activeTab === id ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-on-light-muted)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '20px',
          fontWeight: 700,
          color: activeTab === id ? '#FFFFFF' : 'var(--text-on-light)',
        }}
      >
        {count}
      </span>
    </div>
  );

  return (
    <div>
      <PageTitle
        title="Incident Registry"
        subtitle="Complete institutional registry of ongoing, awaiting verification, and resolved IT work."
      />

      {/* Status Filter Stat Tabs */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {tabStat('all', 'All Work', counts.all)}
        {tabStat('ongoing', 'Ongoing', counts.ongoing)}
        {tabStat('verification', 'Awaiting Verification', counts.verification)}
        {tabStat('reevaluation', 'Re-evaluation', counts.reevaluation)}
        {tabStat('resolved', 'Resolved / Closed', counts.resolved)}
      </div>

      <div className="table-wrapper">
        {/* Filter Bar */}
        <div className="table-header-bar">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '18px', color: 'var(--text-on-light)', margin: 0 }}>
                Registry Entries ({filteredTickets.length}
                {counts.all > 0 ? ` of ${counts.all}` : ''})
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
              Severity and status indicators displayed side-by-side for every incident.
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
                placeholder={`Search ${filteredTickets.length} entries...`}
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
              value={selectedPriority}
              onChange={(e) => {
                setSelectedPriority(e.target.value);
                setPage(1);
              }}
              className="form-select"
              style={{ width: '140px', height: '34px', fontSize: '13px', padding: '4px 8px' }}
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <Spinner size={32} />
          </div>
        ) : filteredTickets.length === 0 ? (
          <EmptyState
            title="No registry entries"
            description="No incidents match the selected filter criteria."
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
              onRowClick={(t) => navigate(`/admin/tickets/${t.ticket_id}`)}
            />

            <Pagination page={page} pageSize={pageSize} total={filteredTickets.length} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
};
