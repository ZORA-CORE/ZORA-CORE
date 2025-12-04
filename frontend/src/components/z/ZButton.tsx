'use client';

import React from 'react';
import Link from 'next/link';

export interface ZButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export function ZButton({
  children,
  variant = 'primary',
  size = 'md',
  href,
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  className = '',
  onClick,
  type = 'button',
}: ZButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-[var(--z-radius-md)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--z-bg-base)] disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-[var(--z-emerald)] text-white hover:bg-[var(--z-emerald)]/90 focus:ring-[var(--z-emerald)] shadow-[var(--z-shadow-sm)]',
    secondary: 'bg-[var(--z-violet)] text-white hover:bg-[var(--z-violet)]/90 focus:ring-[var(--z-violet)] shadow-[var(--z-shadow-sm)]',
    outline: 'border border-[var(--z-border-default)] text-[var(--z-text-primary)] hover:bg-[var(--z-bg-elevated)] hover:border-[var(--z-border-strong)] focus:ring-[var(--z-emerald)]',
    ghost: 'text-[var(--z-text-secondary)] hover:text-[var(--z-text-primary)] hover:bg-[var(--z-bg-surface)] focus:ring-[var(--z-emerald)]',
    danger: 'bg-[var(--z-rose)] text-white hover:bg-[var(--z-rose)]/90 focus:ring-[var(--z-rose)] shadow-[var(--z-shadow-sm)]',
    success: 'bg-[var(--z-emerald)] text-white hover:bg-[var(--z-emerald)]/90 focus:ring-[var(--z-emerald)] shadow-[var(--z-shadow-sm)]',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-[var(--z-text-sm)] gap-1.5',
    md: 'px-4 py-2 text-[var(--z-text-sm)] gap-2',
    lg: 'px-6 py-3 text-[var(--z-text-base)] gap-2.5',
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`;

  const loadingSpinner = (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );

  const content = (
    <>
      {loading && loadingSpinner}
      {!loading && icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
      {!loading && icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {content}
    </button>
  );
}

export default ZButton;
