'use client';

import React from 'react';

export interface ZTableColumn<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
}

export interface ZTableProps<T> {
  columns: ZTableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T, index: number) => void;
  hoverable?: boolean;
  striped?: boolean;
  compact?: boolean;
  className?: string;
}

export function ZTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  hoverable = true,
  striped = false,
  compact = false,
  className = '',
}: ZTableProps<T>) {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3';

  return (
    <div className={`overflow-x-auto rounded-[var(--z-radius-lg)] border border-[var(--z-border-default)] ${className}`}>
      <table className="w-full">
        <thead>
          <tr className="bg-[var(--z-bg-surface)] border-b border-[var(--z-border-default)]">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`
                  ${cellPadding}
                  text-[var(--z-text-xs)] font-semibold uppercase tracking-wider
                  text-[var(--z-text-tertiary)]
                  ${alignClasses[column.align || 'left']}
                `}
                style={{ width: column.width }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--z-border-subtle)]">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className={`${cellPadding} text-center`}>
                <div className="flex items-center justify-center gap-2 text-[var(--z-text-muted)]">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Loading...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={`${cellPadding} text-center text-[var(--z-text-muted)]`}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                onClick={() => onRowClick?.(row, rowIndex)}
                className={`
                  ${striped && rowIndex % 2 === 1 ? 'bg-[var(--z-bg-surface)]/50' : 'bg-transparent'}
                  ${hoverable ? 'hover:bg-[var(--z-bg-surface)] transition-colors' : ''}
                  ${onRowClick ? 'cursor-pointer' : ''}
                `}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`
                      ${cellPadding}
                      text-[var(--z-text-sm)] text-[var(--z-text-secondary)]
                      ${alignClasses[column.align || 'left']}
                    `}
                  >
                    {column.render
                      ? column.render(row[column.key], row, rowIndex)
                      : String(row[column.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ZTable;
