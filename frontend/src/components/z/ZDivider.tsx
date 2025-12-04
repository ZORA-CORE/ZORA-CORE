'use client';

import React from 'react';

export interface ZDividerProps {
  orientation?: 'horizontal' | 'vertical';
  variant?: 'default' | 'subtle' | 'strong' | 'accent';
  spacing?: 'none' | 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export function ZDivider({
  orientation = 'horizontal',
  variant = 'default',
  spacing = 'md',
  label,
  className = '',
}: ZDividerProps) {
  const variantClasses = {
    default: 'bg-[var(--z-border-default)]',
    subtle: 'bg-[var(--z-border-subtle)]',
    strong: 'bg-[var(--z-border-strong)]',
    accent: 'bg-[var(--z-emerald)]/30',
  };

  const spacingClasses = {
    none: '',
    sm: orientation === 'horizontal' ? 'my-2' : 'mx-2',
    md: orientation === 'horizontal' ? 'my-4' : 'mx-4',
    lg: orientation === 'horizontal' ? 'my-6' : 'mx-6',
  };

  if (label) {
    return (
      <div className={`flex items-center ${spacingClasses[spacing]} ${className}`}>
        <div className={`flex-1 h-px ${variantClasses[variant]}`} />
        <span className="px-3 text-[var(--z-text-xs)] font-medium text-[var(--z-text-muted)] uppercase tracking-wider">
          {label}
        </span>
        <div className={`flex-1 h-px ${variantClasses[variant]}`} />
      </div>
    );
  }

  if (orientation === 'vertical') {
    return (
      <div className={`w-px self-stretch ${variantClasses[variant]} ${spacingClasses[spacing]} ${className}`} />
    );
  }

  return (
    <div className={`w-full h-px ${variantClasses[variant]} ${spacingClasses[spacing]} ${className}`} />
  );
}

export default ZDivider;
