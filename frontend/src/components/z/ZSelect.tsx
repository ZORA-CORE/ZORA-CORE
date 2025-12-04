'use client';

import React, { forwardRef } from 'react';

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
  variant?: 'default' | 'filled';
  options: ZSelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
}

export const ZSelect = forwardRef<HTMLSelectElement, ZSelectProps>(({
  label,
  error,
  hint,
  size = 'md',
  variant = 'default',
  options,
  placeholder,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}, ref) => {
  const sizeClasses = {
    sm: 'h-8 text-[var(--z-text-sm)] px-3 pr-8',
    md: 'h-10 text-[var(--z-text-base)] px-3.5 pr-10',
    lg: 'h-12 text-[var(--z-text-md)] px-4 pr-12',
  };

  const variantClasses = {
    default: `
      bg-[var(--z-bg-surface)] border border-[var(--z-border-default)]
      focus:border-[var(--z-emerald)] focus:ring-2 focus:ring-[var(--z-emerald)]/20
    `,
    filled: `
      bg-[var(--z-bg-elevated)] border border-transparent
      focus:border-[var(--z-emerald)] focus:ring-2 focus:ring-[var(--z-emerald)]/20
    `,
  };

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label className="block text-[var(--z-text-sm)] font-medium text-[var(--z-text-primary)] mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          disabled={disabled}
          className={`
            w-full rounded-[var(--z-radius-md)] appearance-none
            text-[var(--z-text-primary)]
            transition-all duration-200 outline-none cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed
            ${sizeClasses[size]}
            ${variantClasses[variant]}
            ${error ? 'border-[var(--z-rose)] focus:border-[var(--z-rose)] focus:ring-[var(--z-rose)]/20' : ''}
          `}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
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
      {error && (
        <p className="mt-1.5 text-[var(--z-text-xs)] text-[var(--z-rose)]">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1.5 text-[var(--z-text-xs)] text-[var(--z-text-muted)]">{hint}</p>
      )}
    </div>
  );
});

ZSelect.displayName = 'ZSelect';

export default ZSelect;
