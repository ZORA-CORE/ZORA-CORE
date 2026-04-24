/**
 * React hook around `streamZeroTouch`.
 *
 * Exposes a mutable state machine with the phase the zero-touch run
 * is currently in, plus the latest `pr`, `commit`, and `preview`
 * payloads. Component code (e.g. `<ZeroTouchPreviewPill>`) reads off
 * this hook and renders whatever the Forge UI needs.
 */

'use client';

import { useCallback, useRef, useState } from 'react';
import {
  streamZeroTouch,
  type ZeroTouchEvent,
  type ZeroTouchRequest,
} from './client';

export type ZeroTouchPhase =
  | 'idle'
  | 'pushing'
  | 'opening_pr'
  | 'awaiting_preview'
  | 'preview_ready'
  | 'preview_timeout'
  | 'done'
  | 'error';

export interface ZeroTouchState {
  phase: ZeroTouchPhase;
  pollAttempt: number;
  commit?: { sha: string; url: string; fileCount: number };
  pr?: { number: number; url: string };
  preview?: { url: string; project?: string };
  error?: { message: string; status?: number | null; detail?: string | null };
}

export interface UseZeroTouchResult {
  state: ZeroTouchState;
  run: (req: ZeroTouchRequest) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

const initialState: ZeroTouchState = { phase: 'idle', pollAttempt: 0 };

export function useZeroTouch(): UseZeroTouchResult {
  const [state, setState] = useState<ZeroTouchState>(initialState);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async (req: ZeroTouchRequest) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setState({ phase: 'pushing', pollAttempt: 0 });

    const handle = (ev: ZeroTouchEvent) => {
      setState((prev) => {
        switch (ev.type) {
          case 'started':
            return { ...prev, phase: 'pushing' };
          case 'commit_pushed':
            return {
              ...prev,
              phase: 'opening_pr',
              commit: { sha: ev.commitSha, url: ev.commitUrl, fileCount: ev.fileCount },
            };
          case 'pr_opened':
            return {
              ...prev,
              phase: 'awaiting_preview',
              pr: { number: ev.prNumber, url: ev.prUrl },
            };
          case 'preview_poll':
            return { ...prev, pollAttempt: ev.attempt };
          case 'preview_url':
            return {
              ...prev,
              phase: 'preview_ready',
              preview: { url: ev.url, project: ev.project },
            };
          case 'preview_timeout':
            return { ...prev, phase: 'preview_timeout' };
          case 'done':
            // `preview_ready` / `preview_timeout` / `error` already set the
            // phase — `done` just confirms stream close.
            return prev.phase === 'pushing' ||
              prev.phase === 'opening_pr' ||
              prev.phase === 'awaiting_preview'
              ? { ...prev, phase: 'done' }
              : prev;
          case 'error':
            return {
              ...prev,
              phase: 'error',
              error: {
                message: ev.message,
                status: ev.status ?? null,
                detail: ev.detail ?? null,
              },
            };
          default:
            return prev;
        }
      });
    };

    try {
      await streamZeroTouch(req, { onEvent: handle, signal: ac.signal });
    } catch (err) {
      if (ac.signal.aborted) return;
      const msg = err instanceof Error ? err.message : String(err);
      setState((prev) => ({
        ...prev,
        phase: 'error',
        error: { message: msg },
      }));
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(initialState);
  }, []);

  return { state, run, cancel, reset };
}
