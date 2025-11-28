'use client';

import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
}: BadgeProps) {
  const variantClasses = {
    default: 'bg-[var(--foreground)]/10 text-[var(--foreground)]/70',
    primary: 'bg-[var(--primary)]/10 text-[var(--primary)]',
    secondary: 'bg-[var(--secondary)]/10 text-[var(--secondary)]',
    accent: 'bg-[var(--accent)]/10 text-[var(--accent)]',
    success: 'bg-[var(--primary)]/10 text-[var(--primary)]',
    warning: 'bg-[var(--accent)]/10 text-[var(--accent)]',
    danger: 'bg-[var(--danger)]/10 text-[var(--danger)]',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {children}
    </span>
  );
}

export default Badge;
