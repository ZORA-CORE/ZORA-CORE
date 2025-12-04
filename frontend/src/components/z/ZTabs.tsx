'use client';

import React from 'react';

export interface ZTabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface ZTabsProps {
  items: ZTabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline' | 'segment';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}

export function ZTabs({
  items,
  activeTab,
  onChange,
  variant = 'default',
  size = 'md',
  fullWidth = false,
  className = '',
}: ZTabsProps) {
  const containerClasses = {
    default: 'border-b border-[var(--z-border-default)]',
    pills: 'bg-[var(--z-bg-surface)] p-1 rounded-[var(--z-radius-lg)]',
    underline: 'border-b border-[var(--z-border-subtle)]',
    segment: 'bg-[var(--z-bg-surface)] p-1 rounded-[var(--z-radius-lg)] border border-[var(--z-border-default)]',
  };

  const tabBaseClasses = {
    default: 'relative px-4 py-2.5 text-[var(--z-text-tertiary)] hover:text-[var(--z-text-primary)] transition-colors',
    pills: 'px-4 py-2 rounded-[var(--z-radius-md)] text-[var(--z-text-tertiary)] hover:text-[var(--z-text-primary)] transition-all',
    underline: 'relative px-4 py-2.5 text-[var(--z-text-tertiary)] hover:text-[var(--z-text-primary)] transition-colors',
    segment: 'flex-1 px-4 py-2 rounded-[var(--z-radius-md)] text-[var(--z-text-tertiary)] hover:text-[var(--z-text-primary)] transition-all text-center',
  };

  const tabActiveClasses = {
    default: 'text-[var(--z-emerald)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[var(--z-emerald)] after:rounded-full',
    pills: 'bg-[var(--z-emerald)] text-white shadow-[var(--z-shadow-sm)]',
    underline: 'text-[var(--z-text-primary)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[var(--z-emerald)] after:rounded-full',
    segment: 'bg-[var(--z-bg-elevated)] text-[var(--z-text-primary)] shadow-[var(--z-shadow-sm)]',
  };

  const sizeClasses = {
    sm: 'text-[var(--z-text-xs)] gap-1.5',
    md: 'text-[var(--z-text-sm)] gap-2',
    lg: 'text-[var(--z-text-base)] gap-2.5',
  };

  return (
    <div className={`${containerClasses[variant]} ${fullWidth ? 'w-full' : 'inline-flex'} ${className}`}>
      <div className={`flex ${fullWidth ? 'w-full' : ''} ${variant === 'segment' ? 'gap-1' : 'gap-0'}`}>
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => !item.disabled && onChange(item.id)}
            disabled={item.disabled}
            className={`
              inline-flex items-center justify-center font-medium
              ${tabBaseClasses[variant]}
              ${activeTab === item.id ? tabActiveClasses[variant] : ''}
              ${sizeClasses[size]}
              ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${fullWidth && variant === 'segment' ? 'flex-1' : ''}
            `}
          >
            {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span className={`
                px-1.5 py-0.5 text-[10px] font-semibold rounded-full
                ${activeTab === item.id && variant === 'pills'
                  ? 'bg-white/20 text-white'
                  : 'bg-[var(--z-bg-elevated)] text-[var(--z-text-tertiary)]'
                }
              `}>
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ZTabs;
