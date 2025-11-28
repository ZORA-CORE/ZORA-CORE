'use client';

import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'accent';
  className?: string;
}

export function StatCard({
  label,
  value,
  sublabel,
  trend,
  trendValue,
  icon,
  variant = 'default',
  className = '',
}: StatCardProps) {
  const variantClasses = {
    default: 'bg-[var(--card-bg)] border-[var(--card-border)]',
    primary: 'bg-[var(--primary)]/5 border-[var(--primary)]/20',
    secondary: 'bg-[var(--secondary)]/5 border-[var(--secondary)]/20',
    accent: 'bg-[var(--accent)]/5 border-[var(--accent)]/20',
  };

  const trendColors = {
    up: 'text-[var(--primary)]',
    down: 'text-[var(--danger)]',
    neutral: 'text-[var(--foreground)]/40',
  };

  return (
    <div className={`p-6 rounded-xl border ${variantClasses[variant]} ${className}`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm text-[var(--foreground)]/60">{label}</span>
        {icon && (
          <span className="text-[var(--foreground)]/40">{icon}</span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-[var(--foreground)]">{value}</span>
        {trend && trendValue && (
          <span className={`text-sm font-medium ${trendColors[trend]}`}>
            {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}{trendValue}
          </span>
        )}
      </div>
      {sublabel && (
        <p className="mt-1 text-xs text-[var(--foreground)]/40">{sublabel}</p>
      )}
    </div>
  );
}

export default StatCard;
