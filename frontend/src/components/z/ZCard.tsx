'use client';

import React from 'react';
import Link from 'next/link';

export interface ZCardProps {
  children: React.ReactNode;
  href?: string;
  variant?: 'default' | 'elevated' | 'subtle' | 'bordered' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  accent?: 'emerald' | 'rose' | 'amber' | 'violet' | 'sky' | 'none';
  className?: string;
  onClick?: () => void;
}

export function ZCard({
  children,
  href,
  variant = 'default',
  padding = 'md',
  hoverable = false,
  accent = 'none',
  className = '',
  onClick,
}: ZCardProps) {
  const variantClasses = {
    default: 'bg-[var(--z-bg-surface)] border border-[var(--z-border-default)]',
    elevated: 'bg-[var(--z-bg-elevated)] border border-[var(--z-border-subtle)] shadow-[var(--z-shadow-md)]',
    subtle: 'bg-[var(--z-bg-surface)]/50 border border-[var(--z-border-subtle)]',
    bordered: 'bg-transparent border border-[var(--z-border-default)]',
    glass: 'bg-[var(--z-bg-surface)]/80 backdrop-blur-sm border border-[var(--z-border-subtle)]',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const accentClasses = {
    none: '',
    emerald: 'border-l-2 border-l-[var(--z-emerald)]',
    rose: 'border-l-2 border-l-[var(--z-rose)]',
    amber: 'border-l-2 border-l-[var(--z-amber)]',
    violet: 'border-l-2 border-l-[var(--z-violet)]',
    sky: 'border-l-2 border-l-[var(--z-sky)]',
  };

  const hoverClasses = hoverable
    ? 'hover:border-[var(--z-border-strong)] hover:bg-[var(--z-bg-elevated)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer'
    : 'transition-colors duration-200';

  const classes = `rounded-[var(--z-radius-lg)] ${variantClasses[variant]} ${paddingClasses[padding]} ${accentClasses[accent]} ${hoverClasses} ${className}`;

  if (href) {
    return (
      <Link href={href} className={`block ${classes}`}>
        {children}
      </Link>
    );
  }

  if (onClick) {
    return (
      <div className={classes} onClick={onClick} role="button" tabIndex={0}>
        {children}
      </div>
    );
  }

  return <div className={classes}>{children}</div>;
}

export default ZCard;
