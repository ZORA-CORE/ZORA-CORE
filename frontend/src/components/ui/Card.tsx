'use client';

import React from 'react';
import Link from 'next/link';

interface CardProps {
  children: React.ReactNode;
  href?: string;
  variant?: 'default' | 'elevated' | 'bordered';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  className?: string;
  onClick?: () => void;
}

export function Card({
  children,
  href,
  variant = 'default',
  padding = 'md',
  hoverable = false,
  className = '',
  onClick,
}: CardProps) {
  const variantClasses = {
    default: 'bg-[var(--card-bg)] border border-[var(--card-border)]',
    elevated: 'bg-[var(--card-bg)] shadow-lg shadow-black/20',
    bordered: 'bg-transparent border border-[var(--card-border)]',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const hoverClasses = hoverable
    ? 'hover:border-[var(--primary)]/50 hover:-translate-y-1 transition-all cursor-pointer'
    : '';

  const classes = `rounded-xl ${variantClasses[variant]} ${paddingClasses[padding]} ${hoverClasses} ${className}`;

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

export default Card;
