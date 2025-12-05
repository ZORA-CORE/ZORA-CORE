'use client';

import React from 'react';

export interface ZSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ZSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
  options: ZSelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
}

export function ZSelect({
  label,
  error,
  hint,
  size = 'md',
  options,
  placeholder,
  fullWidth = true,
  className = '',
  id,
  ...props
}: ZSelectProps) {
  const selectId = id || `z-select-${Math.random().toString(36).substr(2, 9)}`;

  const sizeStyles = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2.5 text-base',
  };

  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-medium text-[var(--z-text-secondary)] mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={`
            w-full rounded-lg border bg-[var(--z-surface)] text-[var(--z-text-primary)]
            focus:outline-none focus:ring-1 focus:ring-[var(--z-accent)] focus:border-[var(--z-accent)]
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors appearance-none cursor-pointer
            ${error ? 'border-red-500/50 focus:ring-red-500 focus:border-red-500' : 'border-[var(--z-border)]'}
            ${sizeStyles[size]}
            pr-10
            ${className}
          `}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--z-text-muted)]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {(error || hint) && (
        <p className={`mt-1 text-xs ${error ? 'text-red-400' : 'text-[var(--z-text-muted)]'}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
