'use client';

import React from 'react';
import Link from 'next/link';

interface HeroSectionProps {
  headline: string;
  subheadline?: string;
  primaryCta?: {
    label: string;
    href: string;
  };
  secondaryCta?: {
    label: string;
    href: string;
  };
  badge?: string;
  centered?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function HeroSection({
  headline,
  subheadline,
  primaryCta,
  secondaryCta,
  badge,
  centered = true,
  size = 'lg',
  className = '',
}: HeroSectionProps) {
  const sizeClasses = {
    sm: 'py-12 md:py-16',
    md: 'py-16 md:py-24',
    lg: 'py-24 md:py-32',
  };

  const headlineClasses = {
    sm: 'text-2xl md:text-3xl',
    md: 'text-3xl md:text-4xl lg:text-5xl',
    lg: 'text-4xl md:text-5xl lg:text-6xl',
  };

  return (
    <section className={`${sizeClasses[size]} ${className}`}>
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${centered ? 'text-center' : ''}`}>
        {badge && (
          <div className={`mb-6 ${centered ? 'flex justify-center' : ''}`}>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
              {badge}
            </span>
          </div>
        )}

        <h1 className={`${headlineClasses[size]} font-bold text-[var(--foreground)] tracking-tight leading-tight max-w-4xl ${centered ? 'mx-auto' : ''}`}>
          {headline}
        </h1>

        {subheadline && (
          <p className={`mt-6 text-lg md:text-xl text-[var(--foreground)]/60 max-w-2xl ${centered ? 'mx-auto' : ''}`}>
            {subheadline}
          </p>
        )}

        {(primaryCta || secondaryCta) && (
          <div className={`mt-10 flex flex-col sm:flex-row gap-4 ${centered ? 'justify-center' : ''}`}>
            {primaryCta && (
              <Link
                href={primaryCta.href}
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-[var(--primary)] text-white font-medium hover:bg-[var(--primary-dark)] transition-colors"
              >
                {primaryCta.label}
              </Link>
            )}
            {secondaryCta && (
              <Link
                href={secondaryCta.href}
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-[var(--card-border)] text-[var(--foreground)] font-medium hover:bg-[var(--card-bg)] transition-colors"
              >
                {secondaryCta.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default HeroSection;
