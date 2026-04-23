'use client';

import { useMemo, useState } from 'react';
import {
  ChevronsLeft,
  ChevronsRight,
  MessageSquarePlus,
  MoreHorizontal,
  Moon,
  Sun,
  Trash2,
} from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { groupThreads, type ChatThread } from './threadStore';

interface ChatSidebarProps {
  threads: ChatThread[];
  activeThreadId: string | null;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onNewChat: () => void;
  onSelectThread: (id: string) => void;
  onDeleteThread: (id: string) => void;
}

export function ChatSidebar({
  threads,
  activeThreadId,
  collapsed,
  onToggleCollapsed,
  onNewChat,
  onSelectThread,
  onDeleteThread,
}: ChatSidebarProps) {
  const groups = useMemo(() => groupThreads(threads), [threads]);
  const { theme, toggle } = useTheme();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  if (collapsed) {
    return (
      <aside
        className="flex h-full w-[52px] shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-800 dark:bg-[#171717] dark:text-neutral-300"
        aria-label="Chat history (collapsed)"
      >
        <div className="flex h-14 shrink-0 items-center justify-center border-b border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="flex h-9 w-9 items-center justify-center rounded-md text-neutral-600 transition hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800"
            title="Open sidebar"
            aria-label="Open sidebar"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col items-center gap-1 py-2">
          <button
            type="button"
            onClick={onNewChat}
            className="flex h-9 w-9 items-center justify-center rounded-md text-neutral-600 transition hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800"
            title="New chat"
            aria-label="New chat"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-auto flex flex-col items-center gap-1 border-t border-neutral-200 py-2 dark:border-neutral-800">
          <button
            type="button"
            onClick={toggle}
            className="flex h-9 w-9 items-center justify-center rounded-md text-neutral-600 transition hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="flex h-full w-[260px] shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 text-neutral-800 dark:border-neutral-800 dark:bg-[#171717] dark:text-neutral-200"
      aria-label="Chat history"
    >
      <div className="flex h-14 shrink-0 items-center justify-between px-3 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <svg
            width="18"
            height="18"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M16 3 L29 10 V22 L16 29 L3 22 V10 Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M16 9 L23 13 V19 L16 23 L9 19 V13 Z"
              stroke="#00CCFF"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-sm font-semibold tracking-tight">Valhalla</span>
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800"
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="px-2 pt-2">
        <button
          type="button"
          onClick={onNewChat}
          className="flex h-10 w-full items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-800 transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
        >
          <MessageSquarePlus className="h-4 w-4" />
          New chat
        </button>
      </div>

      <nav className="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-2" aria-label="Thread history">
        {groups.length === 0 ? (
          <div className="px-2 py-8 text-center text-xs text-neutral-500 dark:text-neutral-500">
            No threads yet. Start a new chat to forge something.
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mb-3">
              <div className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">
                {group.label}
              </div>
              <ul className="flex flex-col gap-0.5">
                {group.threads.map((t) => {
                  const isActive = t.id === activeThreadId;
                  const isMenuOpen = menuOpenId === t.id;
                  return (
                    <li key={t.id}>
                      <div
                        className={`group relative flex items-center rounded-md text-sm ${
                          isActive
                            ? 'bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                            : 'text-neutral-700 hover:bg-neutral-200/60 dark:text-neutral-300 dark:hover:bg-neutral-800/60'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectThread(t.id)}
                          className="flex-1 truncate px-3 py-2 text-left"
                          title={t.title}
                        >
                          {t.title}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(isMenuOpen ? null : t.id);
                          }}
                          className={`mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-500 transition dark:text-neutral-400 ${
                            isMenuOpen
                              ? 'bg-neutral-300 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100'
                              : 'opacity-0 hover:bg-neutral-300 hover:text-neutral-800 group-hover:opacity-100 dark:hover:bg-neutral-700 dark:hover:text-neutral-100'
                          }`}
                          aria-label="Thread options"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {isMenuOpen && (
                          <div
                            className="absolute right-1 top-full z-20 mt-1 w-32 overflow-hidden rounded-md border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
                            role="menu"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpenId(null);
                                onDeleteThread(t.id);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </nav>

      <div className="shrink-0 border-t border-neutral-200 px-2 py-2 dark:border-neutral-800">
        <button
          type="button"
          onClick={toggle}
          className="flex h-9 w-full items-center gap-2 rounded-md px-3 text-xs font-medium text-neutral-600 transition hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="h-4 w-4" />
              Light mode
            </>
          ) : (
            <>
              <Moon className="h-4 w-4" />
              Dark mode
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
