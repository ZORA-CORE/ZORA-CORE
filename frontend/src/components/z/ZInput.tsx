'use client';

import React, { forwardRef } from 'react';

export interface ZInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'ghost';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const ZInput = forwardRef<HTMLInputElement, ZInputProps>(({
  label,
  error,
  hint,
  size = 'md',
  variant = 'default',
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}, ref) => {
  const sizeClasses = {
    sm: 'h-8 text-[var(--z-text-sm)] px-3',
    md: 'h-10 text-[var(--z-text-base)] px-3.5',
    lg: 'h-12 text-[var(--z-text-md)] px-4',
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
    ghost: `
      bg-transparent border border-transparent
      hover:bg-[var(--z-bg-surface)] focus:bg-[var(--z-bg-surface)]
      focus:border-[var(--z-emerald)] focus:ring-2 focus:ring-[var(--z-emerald)]/20
    `,
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-5 h-5',
  };

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label className="block text-[var(--z-text-sm)] font-medium text-[var(--z-text-primary)] mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 text-[var(--z-text-muted)] ${iconSizeClasses[size]}`}>
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={`
            w-full rounded-[var(--z-radius-md)]
            text-[var(--z-text-primary)] placeholder-[var(--z-text-muted)]
            transition-all duration-200 outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
            ${sizeClasses[size]}
            ${variantClasses[variant]}
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
            ${error ? 'border-[var(--z-rose)] focus:border-[var(--z-rose)] focus:ring-[var(--z-rose)]/20' : ''}
          `}
          {...props}
        />
        {rightIcon && (
          <div className={`absolute right-3 top-1/2 -translate-y-1/2 text-[var(--z-text-muted)] ${iconSizeClasses[size]}`}>
            {rightIcon}
          </div>
        )}
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

ZInput.displayName = 'ZInput';

export default ZInput;
