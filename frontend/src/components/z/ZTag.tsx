'use client';

import React from 'react';

export interface ZTagProps {
  children: React.ReactNode;
  variant?: 'default' | 'emerald' | 'rose' | 'amber' | 'violet' | 'sky' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

export function ZTag({
  children,
  variant = 'default',
  size = 'sm',
  icon,
  className = '',
}: ZTagProps) {
  const variantClasses = {
    default: 'bg-[var(--z-bg-elevated)] text-[var(--z-text-secondary)] border-[var(--z-border-subtle)]',
    emerald: 'bg-[var(--z-emerald-soft)] text-[var(--z-emerald)] border-[var(--z-emerald-border)]',
    rose: 'bg-[var(--z-rose-soft)] text-[var(--z-rose)] border-[var(--z-rose-border)]',
    amber: 'bg-[var(--z-amber-soft)] text-[var(--z-amber)] border-[var(--z-amber-border)]',
    violet: 'bg-[var(--z-violet-soft)] text-[var(--z-violet)] border-[var(--z-violet-border)]',
    sky: 'bg-[var(--z-sky-soft)] text-[var(--z-sky)] border-[var(--z-sky-border)]',
    success: 'bg-[var(--z-emerald-soft)] text-[var(--z-emerald)] border-[var(--z-emerald-border)]',
    warning: 'bg-[var(--z-amber-soft)] text-[var(--z-amber)] border-[var(--z-amber-border)]',
    danger: 'bg-[var(--z-rose-soft)] text-[var(--z-rose)] border-[var(--z-rose-border)]',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span className={`inline-flex items-center gap-1 font-medium rounded-[var(--z-radius-full)] border ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

export function ZAgentTag({ agent, size = 'sm' }: { agent: 'odin' | 'baldur' | 'tyr' | 'freya' | 'heimdall' | 'thor'; size?: 'sm' | 'md' }) {
  const agentConfig = {
    odin: { label: 'ODIN', variant: 'violet' as const },
    baldur: { label: 'BALDUR', variant: 'amber' as const },
    tyr: { label: 'TYR', variant: 'rose' as const },
    freya: { label: 'FREYA', variant: 'rose' as const },
    heimdall: { label: 'HEIMDALL', variant: 'sky' as const },
    thor: { label: 'THOR', variant: 'emerald' as const },
  };

  const config = agentConfig[agent];
  return <ZTag variant={config.variant} size={size}>{config.label}</ZTag>;
}

export default ZTag;
