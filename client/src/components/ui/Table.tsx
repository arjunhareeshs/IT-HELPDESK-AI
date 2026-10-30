import React from 'react';
import clsx from 'clsx';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor?: (item: T, index?: number) => string;
  onRowClick?: (item: T) => void;
  className?: string;
}

export function Table<T>({ columns, data, keyExtractor, onRowClick, className }: TableProps<T>) {
  const resolveKey = (item: any, idx: number): string => {
    if (typeof keyExtractor === 'function') {
      try {
        return String(keyExtractor(item, idx));
      } catch {
        // fallback
      }
    }
    return String(item?.ticket_id ?? item?.id ?? item?.key ?? idx);
  };

  return (
    <div className={clsx('table-wrapper', className)}>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className={col.className} style={{ textAlign: col.align || 'left' }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr
                key={resolveKey(item, idx)}
                onClick={() => onRowClick && onRowClick(item)}
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {columns.map((col, idx) => (
                  <td key={idx} className={col.className} style={{ textAlign: col.align || 'left' }}>
                    {col.cell
                      ? col.cell(item)
                      : col.accessorKey
                      ? (item[col.accessorKey] as unknown as React.ReactNode)
                      : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
