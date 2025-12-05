'use client';

import React from 'react';

export interface ZInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export function ZInput({
  label,
  error,
  hint,
  size = 'md',
  leftIcon,
  rightIcon,
  fullWidth = true,
  className = '',
  id,
  ...props
}: ZInputProps) {
  const inputId = id || `z-input-${Math.random().toString(36).substr(2, 9)}`;

  const sizeStyles = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2.5 text-base',
  };

  const iconSizeStyles = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-medium text-[var(--z-text-secondary)] mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 text-[var(--z-text-muted)] ${iconSizeStyles[size]}`}>
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={`
            w-full rounded-lg border bg-[var(--z-surface)] text-[var(--z-text-primary)]
            placeholder:text-[var(--z-text-muted)]
            focus:outline-none focus:ring-1 focus:ring-[var(--z-accent)] focus:border-[var(--z-accent)]
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
            ${error ? 'border-red-500/50 focus:ring-red-500 focus:border-red-500' : 'border-[var(--z-border)]'}
            ${sizeStyles[size]}
            ${leftIcon ? 'pl-9' : ''}
            ${rightIcon ? 'pr-9' : ''}
            ${className}
          `}
          {...props}
        />
        {rightIcon && (
          <div className={`absolute right-3 top-1/2 -translate-y-1/2 text-[var(--z-text-muted)] ${iconSizeStyles[size]}`}>
            {rightIcon}
          </div>
        )}
      </div>
      {(error || hint) && (
        <p className={`mt-1 text-xs ${error ? 'text-red-400' : 'text-[var(--z-text-muted)]'}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

export interface ZTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
}

export function ZTextarea({
  label,
  error,
  hint,
  fullWidth = true,
  className = '',
  id,
  rows = 3,
  ...props
}: ZTextareaProps) {
  const textareaId = id || `z-textarea-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-xs font-medium text-[var(--z-text-secondary)] mb-1.5"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        className={`
          w-full rounded-lg border bg-[var(--z-surface)] text-[var(--z-text-primary)]
          placeholder:text-[var(--z-text-muted)]
          focus:outline-none focus:ring-1 focus:ring-[var(--z-accent)] focus:border-[var(--z-accent)]
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors resize-none
          px-3 py-2 text-sm
          ${error ? 'border-red-500/50 focus:ring-red-500 focus:border-red-500' : 'border-[var(--z-border)]'}
          ${className}
        `}
        {...props}
      />
      {(error || hint) && (
        <p className={`mt-1 text-xs ${error ? 'text-red-400' : 'text-[var(--z-text-muted)]'}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
