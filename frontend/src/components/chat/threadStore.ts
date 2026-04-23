'use client';

import type { ChatMessage } from './types';

/**
 * LocalStorage-backed thread store.
 *
 * Each thread persists its messages, Dify conversation_id, and a
 * human-readable title so the sidebar can render a ChatGPT-style
 * "Today / Previous 7 Days / …" list without a backend round-trip.
 *
 * PR 1 intentionally stays localStorage-only to keep the diff small.
 * PR 2+ can migrate to Supabase when we wire full Tool-Use agents.
 */

export interface ChatThread {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  conversationId: string;
  messages: ChatMessage[];
}

const STORAGE_KEY = 'valhalla.threads.v1';
const ACTIVE_KEY = 'valhalla.threads.active';

function isChatThread(x: unknown): x is ChatThread {
  if (!x || typeof x !== 'object') return false;
  const t = x as Partial<ChatThread>;
  return (
    typeof t.id === 'string' &&
    typeof t.title === 'string' &&
    typeof t.createdAt === 'number' &&
    typeof t.updatedAt === 'number' &&
    Array.isArray(t.messages)
  );
}

export function loadThreads(): ChatThread[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isChatThread).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function saveThreads(threads: ChatThread[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
  } catch {
    /* quota exceeded or unavailable — silently drop */
  }
}

export function loadActiveThreadId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function saveActiveThreadId(id: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (id) window.localStorage.setItem(ACTIVE_KEY, id);
    else window.localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Derive a ChatGPT-style thread title from the first user message.
 * Keeps it short (max ~48 chars), strips markdown fences, trims punctuation.
 */
export function titleFromMessage(text: string): string {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'New chat';
  const trimmed = cleaned.length > 48 ? `${cleaned.slice(0, 48).trimEnd()}…` : cleaned;
  return trimmed;
}

export interface ThreadGroup {
  label: string;
  threads: ChatThread[];
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * Group threads into ChatGPT-style time buckets.
 * The cutoff logic uses local midnight so `today` means the current calendar day.
 */
export function groupThreads(threads: ChatThread[], now: number = Date.now()): ThreadGroup[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const startOfToday = today.getTime();

  const todayThreads: ChatThread[] = [];
  const sevenDayThreads: ChatThread[] = [];
  const thirtyDayThreads: ChatThread[] = [];
  const olderThreads: ChatThread[] = [];

  for (const t of threads) {
    const age = now - t.updatedAt;
    if (t.updatedAt >= startOfToday) {
      todayThreads.push(t);
    } else if (age < 7 * DAY) {
      sevenDayThreads.push(t);
    } else if (age < 30 * DAY) {
      thirtyDayThreads.push(t);
    } else {
      olderThreads.push(t);
    }
  }

  const groups: ThreadGroup[] = [];
  if (todayThreads.length) groups.push({ label: 'Today', threads: todayThreads });
  if (sevenDayThreads.length) groups.push({ label: 'Previous 7 Days', threads: sevenDayThreads });
  if (thirtyDayThreads.length) groups.push({ label: 'Previous 30 Days', threads: thirtyDayThreads });
  if (olderThreads.length) groups.push({ label: 'Older', threads: olderThreads });
  return groups;
}
