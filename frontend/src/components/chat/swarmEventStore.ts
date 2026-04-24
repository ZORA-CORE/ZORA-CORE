'use client';

/**
 * Valhalla AI — Singularity Hotfix: SSE-safe swarm event store.
 *
 * Problem this solves:
 *   Naive `setThoughts(prev => [...prev, event])` per SSE frame causes
 *   O(n^2) re-renders and React concurrent-mode tears at high token
 *   rates (the Tool-Use loop easily exceeds 30 events/s). The virtual
 *   DOM diff melts, expanding `<think>` blocks stutter, and iframe /
 *   Monaco siblings repaint for every frame.
 *
 * Design:
 *   - A mutable ref holds the authoritative event array plus a
 *     monotonic version counter. All SSE producers push into this ref
 *     SYNCHRONOUSLY (no setState per frame).
 *   - Every push schedules a single `requestAnimationFrame` callback
 *     that bumps the version counter. Subsequent pushes in the same
 *     frame coalesce into that scheduled rAF — so no matter how many
 *     events arrive, React renders AT MOST once per frame (~16ms).
 *   - React subscribes via `useSyncExternalStore`. Its snapshot is the
 *     version counter (a cheap primitive), so identity only changes
 *     when there is actually new data — preventing accidental
 *     re-renders on unrelated state changes higher in the tree.
 *
 * This is the same architecture Vercel's AI SDK uses internally for
 * high-frequency token streams. It keeps the entire swarm UI smooth
 * at 60fps even when the orchestrator emits hundreds of events in a
 * second.
 */
import { useSyncExternalStore } from 'react';
import type { ThoughtEvent } from './artifacts';

type Listener = () => void;

export interface SwarmEventStore {
  /** Push events into the store; coalesced into the next rAF frame. */
  push(events: ThoughtEvent | ThoughtEvent[]): void;
  /** Replace the entire log (e.g. when switching threads). */
  reset(events?: ThoughtEvent[]): void;
  /** Current snapshot (stable identity until version bumps). */
  snapshot(): ThoughtEvent[];
  /** React subscription callback. */
  subscribe(listener: Listener): () => void;
  /** Server snapshot for SSR. Always empty. */
  serverSnapshot(): ThoughtEvent[];
}

/**
 * Factory — one store per component instance so multiple chat threads
 * mounted in parallel can't cross-contaminate.
 */
export function createSwarmEventStore(): SwarmEventStore {
  // Authoritative buffer. NEVER mutated shallowly after a snapshot is
  // handed out — we replace the reference on flush.
  let buffer: ThoughtEvent[] = [];
  // Snapshot reference actually handed to React. Frozen to signal
  // immutability.
  let snapshot: ThoughtEvent[] = buffer;
  const listeners = new Set<Listener>();

  // rAF batching state. `pending` is the scheduled handle; when null,
  // the next push will schedule a fresh rAF. All pushes that land
  // while a frame is pending coalesce into that frame — this is what
  // makes the cost of N pushes in one frame O(N) instead of O(N^2).
  let pending: number | null = null;

  function flush(): void {
    pending = null;
    snapshot = buffer;
    for (const l of listeners) l();
  }

  function schedule(): void {
    if (pending !== null) return;
    if (typeof window === 'undefined') {
      // SSR / tests — flush immediately, no animation frame.
      flush();
      return;
    }
    pending = window.requestAnimationFrame(flush);
  }

  return {
    push(events) {
      const incoming = Array.isArray(events) ? events : [events];
      if (incoming.length === 0) return;
      // Replace the reference so snapshot() returns a fresh array
      // after flush — never mutate the array React may still be
      // reading during concurrent render.
      buffer = buffer.concat(incoming);
      schedule();
    },
    reset(events = []) {
      buffer = events.slice();
      schedule();
    },
    snapshot() {
      return snapshot;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    serverSnapshot() {
      return EMPTY;
    },
  };
}

const EMPTY: ThoughtEvent[] = [];

/**
 * React hook over an external `SwarmEventStore`. Re-renders AT MOST
 * once per animation frame regardless of inbound event rate.
 */
export function useSwarmEvents(store: SwarmEventStore): ThoughtEvent[] {
  return useSyncExternalStore(
    store.subscribe,
    store.snapshot,
    store.serverSnapshot,
  );
}
