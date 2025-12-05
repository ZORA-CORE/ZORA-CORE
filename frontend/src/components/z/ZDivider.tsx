'use client';

import React from 'react';

export interface ZDividerProps {
  orientation?: 'horizontal' | 'vertical';
  variant?: 'solid' | 'dashed' | 'dotted';
  label?: string;
  labelPosition?: 'left' | 'center' | 'right';
  spacing?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SPACING_STYLES = {
  sm: {
    horizontal: 'my-2',
    vertical: 'mx-2',
  },
  md: {
    horizontal: 'my-4',
    vertical: 'mx-4',
  },
  lg: {
    horizontal: 'my-6',
    vertical: 'mx-6',
  },
};

const VARIANT_STYLES = {
  solid: 'border-solid',
  dashed: 'border-dashed',
  dotted: 'border-dotted',
};

export function ZDivider({
  orientation = 'horizontal',
  variant = 'solid',
  label,
  labelPosition = 'center',
  spacing = 'md',
  className = '',
}: ZDividerProps) {
  const spacingStyle = SPACING_STYLES[spacing][orientation];
  const variantStyle = VARIANT_STYLES[variant];

  if (orientation === 'vertical') {
    return (
      <div
        className={`
          inline-block h-full min-h-[1em] w-0
          border-l border-[var(--z-border)]
          ${variantStyle}
          ${spacingStyle}
          ${className}
        `}
      />
    );
  }

  if (label) {
    const labelPositionStyles = {
      left: 'justify-start',
      center: 'justify-center',
      right: 'justify-end',
    };

    return (
      <div className={`flex items-center ${spacingStyle} ${className}`}>
        {labelPosition !== 'left' && (
          <div className={`flex-1 border-t border-[var(--z-border)] ${variantStyle}`} />
        )}
        <span className="px-3 text-xs font-medium text-[var(--z-text-muted)] uppercase tracking-wider">
          {label}
        </span>
        {labelPosition !== 'right' && (
          <div className={`flex-1 border-t border-[var(--z-border)] ${variantStyle}`} />
        )}
      </div>
    );
  }

  return (
    <hr
      className={`
        border-0 border-t border-[var(--z-border)]
        ${variantStyle}
        ${spacingStyle}
        ${className}
      `}
    />
  );
}
