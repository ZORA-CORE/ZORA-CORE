'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

export type CommandCategory = 'navigation' | 'action' | 'agent';

export interface Command {
  id: string;
  label: string;
  category: CommandCategory;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  commands: Command[];
  isOpen: boolean;
  onClose: () => void;
}

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const NavigationIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ActionIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const AgentIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const categoryLabels: Record<CommandCategory, string> = {
  navigation: 'Navigation',
  action: 'Quick Actions',
  agent: 'Agent Queries',
};

const categoryIcons: Record<CommandCategory, React.ReactNode> = {
  navigation: <NavigationIcon />,
  action: <ActionIcon />,
  agent: <AgentIcon />,
};

export function CommandPalette({ commands, isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.description?.toLowerCase().includes(query.toLowerCase())
  );

  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = [];
    }
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<CommandCategory, Command[]>);

  const flatFilteredCommands = filteredCommands;

  const executeCommand = useCallback((command: Command) => {
    command.action();
    onClose();
    setQuery('');
    setSelectedIndex(0);
  }, [onClose]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => 
            prev < flatFilteredCommands.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (flatFilteredCommands[selectedIndex]) {
            executeCommand(flatFilteredCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, flatFilteredCommands, executeCommand, onClose]);

  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  let globalIndex = 0;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="flex min-h-full items-start justify-center p-4 pt-[15vh]">
        <div className="relative w-full max-w-xl transform overflow-hidden rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-2xl transition-all">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--card-border)]">
            <span className="text-[var(--foreground)]/50">
              <SearchIcon />
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent text-[var(--foreground)] placeholder:text-[var(--foreground)]/40 focus:outline-none text-sm"
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs text-[var(--foreground)]/50 bg-[var(--background)] rounded border border-[var(--card-border)]">
              ESC
            </kbd>
          </div>

          <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
            {filteredCommands.length === 0 ? (
              <div className="py-8 text-center text-[var(--foreground)]/50 text-sm">
                No commands found for &quot;{query}&quot;
              </div>
            ) : (
              Object.entries(groupedCommands).map(([category, cmds]) => (
                <div key={category} className="mb-4 last:mb-0">
                  <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[var(--foreground)]/50 uppercase tracking-wider">
                    {categoryIcons[category as CommandCategory]}
                    {categoryLabels[category as CommandCategory]}
                  </div>
                  <div className="space-y-1">
                    {cmds.map((cmd) => {
                      const currentIndex = globalIndex++;
                      const isSelected = currentIndex === selectedIndex;
                      return (
                        <button
                          key={cmd.id}
                          data-index={currentIndex}
                          onClick={() => executeCommand(cmd)}
                          className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                            isSelected
                              ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                              : 'text-[var(--foreground)] hover:bg-[var(--card-border)]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {cmd.icon && (
                              <span className={isSelected ? 'text-[var(--primary)]' : 'text-[var(--foreground)]/50'}>
                                {cmd.icon}
                              </span>
                            )}
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{cmd.label}</div>
                              {cmd.description && (
                                <div className="text-xs text-[var(--foreground)]/50 truncate">
                                  {cmd.description}
                                </div>
                              )}
                            </div>
                          </div>
                          {cmd.shortcut && (
                            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs text-[var(--foreground)]/40 bg-[var(--background)] rounded border border-[var(--card-border)]">
                              {cmd.shortcut}
                            </kbd>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--card-border)] text-xs text-[var(--foreground)]/40">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-[var(--background)] rounded border border-[var(--card-border)]">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-[var(--background)] rounded border border-[var(--card-border)]">↓</kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-[var(--background)] rounded border border-[var(--card-border)]">↵</kbd>
                to select
              </span>
            </div>
            <span>{filteredCommands.length} commands</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  const navigateTo = useCallback((path: string) => {
    router.push(path);
  }, [router]);

  return {
    isOpen,
    open,
    close,
    toggle,
    navigateTo,
  };
}

export default CommandPalette;
