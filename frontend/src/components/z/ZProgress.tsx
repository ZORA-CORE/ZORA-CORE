'use client';

import React from 'react';

export interface ZProgressProps {
  value: number;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'emerald' | 'amber' | 'rose' | 'violet' | 'sky' | 'gradient';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  className?: string;
}

export function ZProgress({
  value,
  max = 100,
  size = 'md',
  variant = 'emerald',
  showLabel = false,
  label,
  animated = false,
  className = '',
}: ZProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses = {
    xs: 'h-1',
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  const variantClasses = {
    default: 'bg-[var(--z-text-muted)]',
    emerald: 'bg-[var(--z-emerald)]',
    amber: 'bg-[var(--z-amber)]',
    rose: 'bg-[var(--z-rose)]',
    violet: 'bg-[var(--z-violet)]',
    sky: 'bg-[var(--z-sky)]',
    gradient: 'bg-gradient-to-r from-[var(--z-emerald)] via-[var(--z-sky)] to-[var(--z-violet)]',
  };

  return (
    <div className={className}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-[var(--z-text-sm)] text-[var(--z-text-secondary)]">{label}</span>
          )}
          {showLabel && (
            <span className="text-[var(--z-text-xs)] font-medium text-[var(--z-text-tertiary)]">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-[var(--z-bg-elevated)] rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`
            h-full rounded-full transition-all duration-500 ease-out
            ${variantClasses[variant]}
            ${animated ? 'animate-pulse' : ''}
          `}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default ZProgress;
