'use client';

import React from 'react';

export interface ZBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'emerald' | 'rose' | 'amber' | 'violet' | 'sky' | 'green' | 'pink' | 'success' | 'warning' | 'error' | 'info';
  size?: 'xs' | 'sm' | 'md';
  dot?: boolean;
  pulse?: boolean;
  agent?: 'odin' | 'thor' | 'freya' | 'baldur' | 'heimdall' | 'tyr' | 'eivor';
  className?: string;
}

const agentConfig = {
  odin: { color: 'var(--z-odin)', soft: 'var(--z-odin-soft)', label: 'ODIN', role: 'Research' },
  thor: { color: 'var(--z-thor)', soft: 'var(--z-thor-soft)', label: 'THOR', role: 'Climate' },
  freya: { color: 'var(--z-freya)', soft: 'var(--z-freya-soft)', label: 'FREYA', role: 'Brand' },
  baldur: { color: 'var(--z-baldur)', soft: 'var(--z-baldur-soft)', label: 'BALDUR', role: 'Learning' },
  heimdall: { color: 'var(--z-heimdall)', soft: 'var(--z-heimdall-soft)', label: 'HEIMDALL', role: 'Analytics' },
  tyr: { color: 'var(--z-tyr)', soft: 'var(--z-tyr-soft)', label: 'TYR', role: 'Ethics' },
  eivor: { color: 'var(--z-eivor)', soft: 'var(--z-eivor-soft)', label: 'EIVOR', role: 'Memory' },
};

export function ZBadge({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
  pulse = false,
  agent,
  className = '',
}: ZBadgeProps) {
  const variantClasses = {
    default: 'bg-[var(--z-bg-elevated)] text-[var(--z-text-secondary)] border-[var(--z-border-default)]',
    emerald: 'bg-[var(--z-emerald-soft)] text-[var(--z-emerald)] border-[var(--z-emerald-border)]',
    rose: 'bg-[var(--z-rose-soft)] text-[var(--z-rose)] border-[var(--z-rose-border)]',
    amber: 'bg-[var(--z-amber-soft)] text-[var(--z-amber)] border-[var(--z-amber-border)]',
    violet: 'bg-[var(--z-violet-soft)] text-[var(--z-violet)] border-[var(--z-violet-border)]',
    sky: 'bg-[var(--z-sky-soft)] text-[var(--z-sky)] border-[var(--z-sky-border)]',
    green: 'bg-[var(--z-green-soft)] text-[var(--z-green)] border-[var(--z-green-border)]',
    pink: 'bg-[var(--z-pink-soft)] text-[var(--z-pink)] border-[var(--z-pink-border)]',
    success: 'bg-[var(--z-emerald-soft)] text-[var(--z-emerald)] border-[var(--z-emerald-border)]',
    warning: 'bg-[var(--z-amber-soft)] text-[var(--z-amber)] border-[var(--z-amber-border)]',
    error: 'bg-[var(--z-rose-soft)] text-[var(--z-rose)] border-[var(--z-rose-border)]',
    info: 'bg-[var(--z-sky-soft)] text-[var(--z-sky)] border-[var(--z-sky-border)]',
  };

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px] gap-1',
    sm: 'px-2 py-0.5 text-[11px] gap-1.5',
    md: 'px-2.5 py-1 text-xs gap-2',
  };

  if (agent) {
    const config = agentConfig[agent];
    return (
      <span
        className={`inline-flex items-center font-medium rounded-[var(--z-radius-full)] border ${sizeClasses[size]} ${className}`}
        style={{
          backgroundColor: config.soft,
          color: config.color,
          borderColor: `${config.color}30`,
        }}
      >
        {dot && (
          <span
            className={`w-1.5 h-1.5 rounded-full ${pulse ? 'animate-pulse' : ''}`}
            style={{ backgroundColor: config.color }}
          />
        )}
        <span className="font-semibold">{config.label}</span>
        <span className="opacity-70">·</span>
        <span>{config.role}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center font-medium rounded-[var(--z-radius-full)] border ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full bg-current ${pulse ? 'animate-pulse' : ''}`}
        />
      )}
      {children}
    </span>
  );
}

export default ZBadge;
