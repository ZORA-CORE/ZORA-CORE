'use client';

import React from 'react';
import { getAgentVisual, type AgentId } from '@/lib/agentVisuals';

export type ZBadgeVariant = 
  | 'default' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'info' 
  | 'muted'
  | 'odin'
  | 'thor'
  | 'freya'
  | 'baldur'
  | 'heimdall'
  | 'tyr'
  | 'eivor';

export type ZBadgeSize = 'sm' | 'md' | 'lg';

export interface ZBadgeProps {
  children: React.ReactNode;
  variant?: ZBadgeVariant;
  size?: ZBadgeSize;
  icon?: React.ReactNode;
  className?: string;
}

const VARIANT_STYLES: Record<ZBadgeVariant, string> = {
  default: 'bg-[var(--z-surface-elevated)] text-[var(--z-text-secondary)] border-[var(--z-border)]',
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  error: 'bg-red-500/10 text-red-400 border-red-500/30',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  muted: 'bg-zinc-800/50 text-zinc-400 border-zinc-700/50',
  odin: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
  thor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  freya: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
  baldur: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  heimdall: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  tyr: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  eivor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
};

const SIZE_STYLES: Record<ZBadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-xs',
  lg: 'px-2.5 py-1 text-sm',
};

export function ZBadge({
  children,
  variant = 'default',
  size = 'md',
  icon,
  className = '',
}: ZBadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded border font-medium
        ${VARIANT_STYLES[variant]}
        ${SIZE_STYLES[size]}
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

export interface ZAgentBadgeProps {
  agentId: string;
  size?: ZBadgeSize;
  showIcon?: boolean;
  className?: string;
}

export function ZAgentBadge({
  agentId,
  size = 'md',
  showIcon = true,
  className = '',
}: ZAgentBadgeProps) {
  const visual = getAgentVisual(agentId);
  const variant = visual.id as ZBadgeVariant;
  
  return (
    <ZBadge
      variant={variant}
      size={size}
      icon={showIcon ? <span>{visual.icon}</span> : undefined}
      className={className}
    >
      {visual.name}
    </ZBadge>
  );
}

export interface ZStatusBadgeProps {
  status: string;
  size?: ZBadgeSize;
  className?: string;
}

export function ZStatusBadge({
  status,
  size = 'md',
  className = '',
}: ZStatusBadgeProps) {
  const statusVariants: Record<string, ZBadgeVariant> = {
    active: 'success',
    completed: 'success',
    success: 'success',
    in_progress: 'info',
    pending: 'warning',
    planned: 'warning',
    trial: 'info',
    failed: 'error',
    error: 'error',
    cancelled: 'muted',
    paused: 'muted',
    archived: 'muted',
  };

  const variant = statusVariants[status.toLowerCase()] || 'default';
  const displayStatus = status.replace(/_/g, ' ');

  return (
    <ZBadge variant={variant} size={size} className={className}>
      {displayStatus}
    </ZBadge>
  );
}
