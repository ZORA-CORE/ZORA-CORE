'use client';

import React from 'react';

export interface ZSectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  centered?: boolean;
  className?: string;
}

export function ZSectionHeader({
  title,
  subtitle,
  badge,
  actions,
  size = 'md',
  centered = false,
  className = '',
}: ZSectionHeaderProps) {
  const sizeClasses = {
    sm: { title: 'text-lg', subtitle: 'text-sm', gap: 'mb-1' },
    md: { title: 'text-xl', subtitle: 'text-sm', gap: 'mb-2' },
    lg: { title: 'text-2xl', subtitle: 'text-base', gap: 'mb-2' },
    xl: { title: 'text-3xl', subtitle: 'text-base', gap: 'mb-3' },
  };

  return (
    <div className={`${centered ? 'text-center' : 'flex items-start justify-between'} ${className}`}>
      <div className={centered ? '' : 'flex-1'}>
        {badge && (
          <div className={`${sizeClasses[size].gap} ${centered ? 'flex justify-center' : ''}`}>
            {badge}
          </div>
        )}
        <h2 className={`${sizeClasses[size].title} font-semibold text-[var(--z-text-primary)]`}>
          {title}
        </h2>
        {subtitle && (
          <p className={`mt-1 ${sizeClasses[size].subtitle} text-[var(--z-text-tertiary)]`}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && !centered && (
        <div className="flex items-center gap-2 ml-4">
          {actions}
        </div>
      )}
      {actions && centered && (
        <div className="flex justify-center gap-2 mt-4">
          {actions}
        </div>
      )}
    </div>
  );
}

export function ZPageHeader({
  title,
  subtitle,
  badge,
  actions,
  className = '',
}: Omit<ZSectionHeaderProps, 'size' | 'centered'>) {
  return (
    <div className={`mb-8 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          {badge && <div className="mb-2">{badge}</div>}
          <h1 className="text-3xl font-bold text-[var(--z-text-primary)]">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-base text-[var(--z-text-tertiary)] max-w-2xl">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3 ml-6">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export default ZSectionHeader;
