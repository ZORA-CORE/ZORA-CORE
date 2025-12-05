'use client';

import React from 'react';

export interface ZMetricTileProps {
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'emerald' | 'rose' | 'amber' | 'violet' | 'sky';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

export function ZMetricTile({
  label,
  value,
  sublabel,
  trend,
  trendValue,
  icon,
  variant = 'default',
  size = 'md',
  className = '',
  onClick,
}: ZMetricTileProps) {
  const variantClasses = {
    default: 'bg-[var(--z-bg-surface)] border-[var(--z-border-default)]',
    emerald: 'bg-[var(--z-emerald-soft)] border-[var(--z-emerald-border)]',
    rose: 'bg-[var(--z-rose-soft)] border-[var(--z-rose-border)]',
    amber: 'bg-[var(--z-amber-soft)] border-[var(--z-amber-border)]',
    violet: 'bg-[var(--z-violet-soft)] border-[var(--z-violet-border)]',
    sky: 'bg-[var(--z-sky-soft)] border-[var(--z-sky-border)]',
  };

  const valueColorClasses = {
    default: 'text-[var(--z-text-primary)]',
    emerald: 'text-[var(--z-emerald)]',
    rose: 'text-[var(--z-rose)]',
    amber: 'text-[var(--z-amber)]',
    violet: 'text-[var(--z-violet)]',
    sky: 'text-[var(--z-sky)]',
  };

  const sizeClasses = {
    sm: { container: 'p-3', value: 'text-xl', label: 'text-xs' },
    md: { container: 'p-4', value: 'text-2xl', label: 'text-sm' },
    lg: { container: 'p-6', value: 'text-3xl', label: 'text-sm' },
  };

  const trendColors = {
    up: 'text-[var(--z-emerald)]',
    down: 'text-[var(--z-rose)]',
    neutral: 'text-[var(--z-text-muted)]',
  };

  const trendIcons = {
    up: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    ),
    down: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    ),
    neutral: null,
  };

  return (
    <div
      className={`rounded-[var(--z-radius-lg)] border ${variantClasses[variant]} ${sizeClasses[size].container} ${onClick ? 'cursor-pointer hover:border-[var(--z-accent)]/50 transition-colors' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <span className={`${sizeClasses[size].label} text-[var(--z-text-tertiary)] font-medium`}>{label}</span>
        {icon && (
          <span className={`${valueColorClasses[variant]} opacity-60`}>{icon}</span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`${sizeClasses[size].value} font-bold ${valueColorClasses[variant]}`}>{value}</span>
        {trend && trendValue && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${trendColors[trend]}`}>
            {trendIcons[trend]}
            {trendValue}
          </span>
        )}
      </div>
      {sublabel && (
        <p className="mt-1 text-xs text-[var(--z-text-muted)]">{sublabel}</p>
      )}
    </div>
  );
}

export default ZMetricTile;
