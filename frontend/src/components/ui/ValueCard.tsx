'use client';

import React from 'react';

interface ValueCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  variant?: 'default' | 'primary' | 'secondary' | 'accent';
  className?: string;
}

export function ValueCard({
  icon,
  title,
  description,
  variant = 'default',
  className = '',
}: ValueCardProps) {
  const variantClasses = {
    default: 'bg-[var(--card-bg)] border-[var(--card-border)]',
    primary: 'bg-[var(--primary)]/5 border-[var(--primary)]/20',
    secondary: 'bg-[var(--secondary)]/5 border-[var(--secondary)]/20',
    accent: 'bg-[var(--accent)]/5 border-[var(--accent)]/20',
  };

  const iconClasses = {
    default: 'text-[var(--foreground)]/60',
    primary: 'text-[var(--primary)]',
    secondary: 'text-[var(--secondary)]',
    accent: 'text-[var(--accent)]',
  };

  return (
    <div className={`p-6 rounded-xl border ${variantClasses[variant]} ${className}`}>
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${iconClasses[variant]} bg-[var(--background)]`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
        {title}
      </h3>
      <p className="text-sm text-[var(--foreground)]/60">
        {description}
      </p>
    </div>
  );
}

export default ValueCard;
