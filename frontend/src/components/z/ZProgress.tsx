'use client';

import React from 'react';

export interface ZProgressProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  valueFormat?: 'percent' | 'fraction' | 'custom';
  customValueFormat?: (value: number, max: number) => string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  animated?: boolean;
  className?: string;
}

const VARIANT_COLORS: Record<string, string> = {
  default: 'bg-[var(--z-accent)]',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
};

const SIZE_HEIGHTS: Record<string, string> = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

export function ZProgress({
  value,
  max = 100,
  label,
  showValue = false,
  valueFormat = 'percent',
  customValueFormat,
  size = 'md',
  variant = 'default',
  animated = false,
  className = '',
}: ZProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const formatValue = () => {
    if (customValueFormat) {
      return customValueFormat(value, max);
    }
    switch (valueFormat) {
      case 'percent':
        return `${Math.round(percentage)}%`;
      case 'fraction':
        return `${value}/${max}`;
      default:
        return `${Math.round(percentage)}%`;
    }
  };

  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-xs font-medium text-[var(--z-text-secondary)]">
              {label}
            </span>
          )}
          {showValue && (
            <span className="text-xs font-medium text-[var(--z-text-muted)]">
              {formatValue()}
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-[var(--z-surface-elevated)] rounded-full overflow-hidden ${SIZE_HEIGHTS[size]}`}>
        <div
          className={`
            ${SIZE_HEIGHTS[size]} rounded-full transition-all duration-500 ease-out
            ${VARIANT_COLORS[variant]}
            ${animated ? 'animate-pulse' : ''}
          `}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export interface ZProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  showValue?: boolean;
  label?: string;
  className?: string;
}

const RING_VARIANT_COLORS: Record<string, string> = {
  default: 'stroke-[var(--z-accent)]',
  success: 'stroke-emerald-500',
  warning: 'stroke-amber-500',
  error: 'stroke-red-500',
  info: 'stroke-blue-500',
};

export function ZProgressRing({
  value,
  max = 100,
  size = 64,
  strokeWidth = 4,
  variant = 'default',
  showValue = true,
  label,
  className = '',
}: ZProgressRingProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            className="stroke-[var(--z-surface-elevated)]"
            strokeWidth={strokeWidth}
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          <circle
            className={`${RING_VARIANT_COLORS[variant]} transition-all duration-500 ease-out`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
            }}
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-semibold text-[var(--z-text-primary)]">
              {Math.round(percentage)}%
            </span>
          </div>
        )}
      </div>
      {label && (
        <span className="mt-1.5 text-xs text-[var(--z-text-muted)]">{label}</span>
      )}
    </div>
  );
}
