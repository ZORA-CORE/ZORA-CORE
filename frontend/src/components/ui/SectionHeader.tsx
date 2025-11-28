'use client';

import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  centered?: boolean;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  badge,
  centered = true,
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`mb-12 ${centered ? 'text-center' : ''} ${className}`}>
      {badge && (
        <div className={`mb-4 ${centered ? 'flex justify-center' : ''}`}>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[var(--secondary)]/10 text-[var(--secondary)] border border-[var(--secondary)]/20">
            {badge}
          </span>
        </div>
      )}

      <h2 className={`text-2xl md:text-3xl font-bold text-[var(--foreground)] ${centered ? 'mx-auto' : ''}`}>
        {title}
      </h2>

      {subtitle && (
        <p className={`mt-4 text-[var(--foreground)]/60 max-w-2xl ${centered ? 'mx-auto' : ''}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default SectionHeader;
