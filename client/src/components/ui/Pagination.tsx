import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ page, pageSize, total, onChange }) => {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  if (total === 0) return null;

  const clamp = (next: number) => {
    onChange(Math.min(Math.max(next, 1), totalPages));
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--surface-panel)',
        fontSize: '13px',
        color: 'var(--text-on-light-muted)',
        flexWrap: 'wrap',
        gap: '8px',
      }}
    >
      <span>
        Showing <strong style={{ color: 'var(--text-on-light)' }}>{start}–{end}</strong> of{' '}
        <strong style={{ color: 'var(--text-on-light)' }}>{total}</strong> entries
      </span>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <button
          disabled={page === 1}
          onClick={() => clamp(page - 1)}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          aria-label="Previous page"
        >
          <ChevronLeft size={13} />
          <span>Previous</span>
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce<(number | 'gap')[]>((acc, p) => {
            const prev = acc[acc.length - 1];
            if (typeof prev === 'number' && p - prev > 1) acc.push('gap');
            acc.push(p);
            return acc;
          }, [])
          .map((item, idx) =>
            item === 'gap' ? (
              <span key={`gap-${idx}`} style={{ padding: '0 2px', color: 'var(--text-on-light-faint)' }}>
                …
              </span>
            ) : (
              <button
                key={item}
                onClick={() => clamp(item)}
                className="btn btn-sm"
                style={{
                  minWidth: '30px',
                  padding: '4px 8px',
                  background: item === page ? 'var(--color-terracotta)' : 'var(--surface-panel)',
                  borderColor: item === page ? 'var(--color-terracotta)' : 'var(--border-subtle)',
                  color: item === page ? '#FFFFFF' : 'var(--text-secondary)',
                  fontWeight: 600,
                }}
              >
                {item}
              </button>
            )
          )}

        <button
          disabled={page >= totalPages}
          onClick={() => clamp(page + 1)}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          aria-label="Next page"
        >
          <span>Next</span>
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
};
