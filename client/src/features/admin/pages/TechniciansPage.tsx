import React, { useState, useMemo } from 'react';
import { useTechnicians } from '../../../hooks/useTechnicians';
import { PageTitle } from '../../../components/shared/PageTitle';
import { Pagination } from '../../../components/ui/Pagination';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Technician } from '../../../types/technician';
import { CheckCircle2, XCircle, Users, Wrench, ShieldCheck, Search, RotateCcw } from 'lucide-react';

export const TechniciansPage: React.FC = () => {
  const { data: technicians, isLoading } = useTechnicians();
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'busy'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 9;

  const counts = useMemo(() => {
    const all = technicians || [];
    return {
      total: all.length,
      available: all.filter((t) => t.is_available).length,
      busy: all.filter((t) => !t.is_available).length,
    };
  }, [technicians]);

  const filtered = useMemo(
    () =>
      (technicians || []).filter((tech) => {
        if (availabilityFilter === 'available' && !tech.is_available) return false;
        if (availabilityFilter === 'busy' && tech.is_available) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const match =
            tech.name.toLowerCase().includes(q) || tech.department.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      }),
    [technicians, availabilityFilter, searchQuery]
  );

  const paginatedTechs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const handleResetFilters = () => {
    setAvailabilityFilter('all');
    setSearchQuery('');
    setPage(1);
  };

  return (
    <div>
      <PageTitle
        title="Technician Directory & Dispatch"
        subtitle="Operational workload, category expertise, and assignment status."
      />

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[
          { id: 'all', label: 'All Technicians' },
          { id: 'available', label: 'Available Now' },
          { id: 'busy', label: 'Engaged / On Call' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setAvailabilityFilter(tab.id as 'all' | 'available' | 'busy')}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-control)',
              fontSize: '13px',
              fontWeight: 600,
              border: '1px solid',
              borderColor: availabilityFilter === tab.id ? 'var(--color-rose)' : 'var(--border-subtle)',
              background: availabilityFilter === tab.id ? 'var(--color-rose)' : 'var(--surface-panel)',
              color: availabilityFilter === tab.id ? '#FFFFFF' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="metrics-grid-colored">
        <div
          className="metric-card-colored metric-card-1"
          onClick={() => {
            setAvailabilityFilter('all');
            setPage(1);
          }}
          title="View all technicians"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="metric-label">Technician Workforce</div>
            <Users width="18" height="18" style={{ color: 'rgba(255, 255, 255, 0.85)' }} />
          </div>
          <div className="metric-value">{counts.total} Total</div>
          <div className="metric-subtext">Dispatch directory (Click to view all)</div>
        </div>

        <div
          className="metric-card-colored metric-card-3"
          onClick={() => {
            setAvailabilityFilter('available');
            setPage(1);
          }}
          title="Click to filter by available technicians"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="metric-label">Ready to Dispatch</div>
            <ShieldCheck width="18" height="18" style={{ color: 'rgba(255, 255, 255, 0.85)' }} />
          </div>
          <div className="metric-value">{counts.available} Available</div>
          <div className="metric-subtext">Eligible for new assignments (Click to filter)</div>
        </div>

        <div
          className="metric-card-colored metric-card-4"
          onClick={() => {
            setAvailabilityFilter('busy');
            setPage(1);
          }}
          title="Click to filter by engaged technicians"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="metric-label">Engaged / On Call</div>
            <Wrench width="18" height="18" style={{ color: 'rgba(255, 255, 255, 0.85)' }} />
          </div>
          <div className="metric-value">{counts.busy} Busy</div>
          <div className="metric-subtext">Currently on active tickets (Click to filter)</div>
        </div>
      </div>

      <div className="table-wrapper" style={{ marginBottom: '20px' }}>
        <div className="table-header-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '18px', color: 'var(--text-on-light)', margin: 0 }}>
              Technician Directory ({filtered.length})
            </h2>
            {(availabilityFilter !== 'all' || searchQuery) && (
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
          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-on-light-faint)' }}
            />
            <input
              type="text"
              placeholder={`Search ${filtered.length} technicians...`}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="form-input"
              style={{ paddingLeft: '32px', width: '220px', height: '34px', fontSize: '13px' }}
            />
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <Spinner size={32} />
          </div>
        ) : paginatedTechs.length === 0 ? (
          <EmptyState
            title="No Technicians Found"
            description="No technicians match the filter."
            action={
              <button onClick={handleResetFilters} className="btn btn-secondary btn-sm" style={{ marginTop: '8px' }}>
                Clear all filters
              </button>
            }
          />
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', padding: '16px 20px' }}>
              {paginatedTechs.map((tech: Technician) => (
            <div key={tech.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '16px', color: 'var(--color-ink)' }}>{tech.name}</h3>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>{tech.department}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}>
                  {tech.is_available ? (
                    <span style={{ color: 'var(--status-success-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={13} /> Available
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <XCircle size={13} /> {tech.availability_status === 'offline' ? 'Offline' : 'Busy'}
                      {tech.max_active_tasks ? ` (${tech.active_tickets_count}/${tech.max_active_tasks})` : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Workload Stats */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  background: 'var(--surface-muted)',
                  padding: '10px',
                  borderRadius: 'var(--radius-control)',
                  textAlign: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-plum)' }}>
                    {tech.active_tickets_count}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Resolved</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)' }}>
                    {tech.completed_tickets_count}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>On-Time</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-rose)' }}>
                    {tech.on_time_rate_percent == null ? '—' : `${tech.on_time_rate_percent}%`}
                  </div>
                </div>
              </div>

              {/* Supported Categories */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-mauve)', marginBottom: '6px' }}>
                  EXPERTISE DOMAINS
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {tech.supported_categories.map((cat, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '11.5px',
                        background: 'var(--surface-hover)',
                        color: 'var(--color-ink)',
                        padding: '2px 8px',
                        borderRadius: 4,
                      }}
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
            </div>

            <Pagination
              page={page}
              pageSize={pageSize}
              total={filtered.length}
              onChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
};
