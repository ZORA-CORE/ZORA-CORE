'use client';

import React from 'react';

export interface ZTableColumn<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T, index: number) => React.ReactNode;
}

export interface ZTableProps<T> {
  columns: ZTableColumn<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  onRowClick?: (item: T, index: number) => void;
  emptyMessage?: string;
  loading?: boolean;
  compact?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  className?: string;
}

export function ZTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No data available',
  loading = false,
  compact = false,
  striped = false,
  hoverable = true,
  className = '',
}: ZTableProps<T>) {
  const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3';
  const headerPadding = compact ? 'px-3 py-2' : 'px-4 py-3';

  if (loading) {
    return (
      <div className={`rounded-lg border border-[var(--z-border)] overflow-hidden ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--z-accent)] border-t-transparent" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`rounded-lg border border-[var(--z-border)] overflow-hidden ${className}`}>
        <div className="flex items-center justify-center py-12 text-[var(--z-text-muted)] text-sm">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-[var(--z-border)] overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--z-surface-elevated)] border-b border-[var(--z-border)]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    ${headerPadding}
                    text-xs font-semibold text-[var(--z-text-secondary)] uppercase tracking-wider
                    text-${column.align || 'left'}
                  `}
                  style={{ width: column.width }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--z-border)]">
            {data.map((item, index) => (
              <tr
                key={keyExtractor(item, index)}
                onClick={() => onRowClick?.(item, index)}
                className={`
                  ${striped && index % 2 === 1 ? 'bg-[var(--z-surface-elevated)]/50' : 'bg-[var(--z-surface)]'}
                  ${hoverable ? 'hover:bg-[var(--z-surface-elevated)] transition-colors' : ''}
                  ${onRowClick ? 'cursor-pointer' : ''}
                `}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`
                      ${cellPadding}
                      text-sm text-[var(--z-text-primary)]
                      text-${column.align || 'left'}
                    `}
                  >
                    {column.render
                      ? column.render(item, index)
                      : (item as Record<string, unknown>)[column.key] as React.ReactNode}
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

export interface ZSimpleTableProps {
  headers: string[];
  rows: React.ReactNode[][];
  compact?: boolean;
  className?: string;
}

export function ZSimpleTable({
  headers,
  rows,
  compact = false,
  className = '',
}: ZSimpleTableProps) {
  const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3';

  return (
    <div className={`rounded-lg border border-[var(--z-border)] overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--z-surface-elevated)] border-b border-[var(--z-border)]">
              {headers.map((header, i) => (
                <th
                  key={i}
                  className={`${cellPadding} text-xs font-semibold text-[var(--z-text-secondary)] uppercase tracking-wider text-left`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--z-border)]">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="bg-[var(--z-surface)] hover:bg-[var(--z-surface-elevated)] transition-colors">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className={`${cellPadding} text-sm text-[var(--z-text-primary)]`}>
                    {cell}
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
