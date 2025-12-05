'use client';

import React from 'react';

export interface ZTab {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface ZTabsProps {
  tabs: ZTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ZTabs({
  tabs,
  activeTab,
  onTabChange,
  variant = 'default',
  size = 'md',
  className = '',
}: ZTabsProps) {
  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-2.5',
  };

  const variantStyles = {
    default: {
      container: 'border-b border-[var(--z-border)]',
      tab: 'border-b-2 -mb-px',
      active: 'border-[var(--z-accent)] text-[var(--z-text-primary)]',
      inactive: 'border-transparent text-[var(--z-text-muted)] hover:text-[var(--z-text-secondary)] hover:border-[var(--z-border)]',
    },
    pills: {
      container: 'gap-2',
      tab: 'rounded-lg border',
      active: 'bg-[var(--z-accent)]/10 border-[var(--z-accent)]/30 text-[var(--z-accent)]',
      inactive: 'bg-transparent border-transparent text-[var(--z-text-muted)] hover:bg-[var(--z-surface-elevated)] hover:text-[var(--z-text-secondary)]',
    },
    underline: {
      container: '',
      tab: 'border-b-2',
      active: 'border-[var(--z-accent)] text-[var(--z-accent)]',
      inactive: 'border-transparent text-[var(--z-text-muted)] hover:text-[var(--z-text-secondary)]',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className={`flex ${styles.container} ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => !tab.disabled && onTabChange(tab.id)}
          disabled={tab.disabled}
          className={`
            flex items-center gap-2 font-medium transition-colors
            ${sizeStyles[size]}
            ${styles.tab}
            ${activeTab === tab.id ? styles.active : styles.inactive}
            ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
          <span>{tab.label}</span>
          {tab.count !== undefined && (
            <span className={`
              text-[10px] px-1.5 py-0.5 rounded-full
              ${activeTab === tab.id 
                ? 'bg-[var(--z-accent)]/20 text-[var(--z-accent)]' 
                : 'bg-[var(--z-surface-elevated)] text-[var(--z-text-muted)]'
              }
            `}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
