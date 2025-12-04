'use client';

import React from 'react';
import { ZButton } from './ZButton';

export interface ZEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  variant?: 'default' | 'compact' | 'card';
  className?: string;
}

export function ZEmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = 'default',
  className = '',
}: ZEmptyStateProps) {
  const variantClasses = {
    default: 'py-12 px-6',
    compact: 'py-8 px-4',
    card: 'py-12 px-6 bg-[var(--z-bg-surface)] rounded-[var(--z-radius-lg)] border border-[var(--z-border-default)]',
  };

  return (
    <div className={`flex flex-col items-center text-center ${variantClasses[variant]} ${className}`}>
      {icon && (
        <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--z-bg-elevated)] text-[var(--z-text-muted)] mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-[var(--z-text-md)] font-semibold text-[var(--z-text-primary)]">
        {title}
      </h3>
      {description && (
        <p className="mt-2 text-[var(--z-text-sm)] text-[var(--z-text-tertiary)] max-w-sm">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-6 flex items-center gap-3">
          {action && (
            <ZButton
              variant="primary"
              size="sm"
              href={action.href}
              onClick={action.onClick}
            >
              {action.label}
            </ZButton>
          )}
          {secondaryAction && (
            <ZButton
              variant="ghost"
              size="sm"
              href={secondaryAction.href}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </ZButton>
          )}
        </div>
      )}
    </div>
  );
}

export default ZEmptyState;
