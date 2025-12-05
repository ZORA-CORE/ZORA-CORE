'use client';

import React from 'react';
import { ZButton } from './ZButton';

export interface ZEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_STYLES = {
  sm: {
    container: 'py-6 px-4',
    icon: 'w-8 h-8 mb-2',
    title: 'text-sm',
    description: 'text-xs',
  },
  md: {
    container: 'py-10 px-6',
    icon: 'w-12 h-12 mb-3',
    title: 'text-base',
    description: 'text-sm',
  },
  lg: {
    container: 'py-16 px-8',
    icon: 'w-16 h-16 mb-4',
    title: 'text-lg',
    description: 'text-base',
  },
};

const DefaultIcon = () => (
  <svg
    className="w-full h-full text-[var(--z-text-muted)]"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
    />
  </svg>
);

export function ZEmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
  className = '',
}: ZEmptyStateProps) {
  const styles = SIZE_STYLES[size];

  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center
        ${styles.container}
        ${className}
      `}
    >
      <div className={styles.icon}>
        {icon || <DefaultIcon />}
      </div>
      <h3 className={`font-semibold text-[var(--z-text-primary)] ${styles.title}`}>
        {title}
      </h3>
      {description && (
        <p className={`mt-1 text-[var(--z-text-muted)] max-w-sm ${styles.description}`}>
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-4 flex items-center gap-3">
          {action && (
            <ZButton
              variant={action.variant || 'primary'}
              size={size === 'lg' ? 'md' : 'sm'}
              onClick={action.onClick}
            >
              {action.label}
            </ZButton>
          )}
          {secondaryAction && (
            <ZButton
              variant="ghost"
              size={size === 'lg' ? 'md' : 'sm'}
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

export interface ZLoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ZLoadingState({
  message = 'Loading...',
  size = 'md',
  className = '',
}: ZLoadingStateProps) {
  const spinnerSizes = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={`flex flex-col items-center justify-center py-10 ${className}`}>
      <div
        className={`
          ${spinnerSizes[size]}
          animate-spin rounded-full
          border-2 border-[var(--z-surface-elevated)]
          border-t-[var(--z-accent)]
        `}
      />
      {message && (
        <p className={`mt-3 text-[var(--z-text-muted)] ${textSizes[size]}`}>
          {message}
        </p>
      )}
    </div>
  );
}

export interface ZErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ZErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  size = 'md',
  className = '',
}: ZErrorStateProps) {
  return (
    <ZEmptyState
      size={size}
      className={className}
      icon={
        <svg
          className="w-full h-full text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      }
      title={title}
      description={message}
      action={onRetry ? { label: 'Try again', onClick: onRetry } : undefined}
    />
  );
}
