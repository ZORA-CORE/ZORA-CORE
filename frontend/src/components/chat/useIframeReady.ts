'use client';

/**
 * Valhalla AI — Singularity Hotfix: dev-server readiness poller.
 *
 * When the swarm spins up a Next.js / Vite dev server inside the E2B
 * sandbox and exposes a port, there is a race between "the URL is
 * assigned" and "the server actually answers 200". Attaching the
 * iframe too early produces the classic "This site can't be reached"
 * flash, followed by another reflow when the server finally responds
 * — jarring and expensive.
 *
 * This hook polls the URL with `HEAD` until either a 2xx/3xx arrives
 * (ready) or the poll budget is exhausted (error). Returns the
 * state the caller can drive a "Waiting for localhost:3000..." UI
 * off of. When the E2B preview URL is `null` the hook is dormant.
 *
 * Why HEAD: it's cheap and avoids downloading the payload. For dev
 * servers that don't implement HEAD (rare), we fall back to GET with
 * `cache: 'no-store'` and a tight AbortSignal.
 */
import { useEffect, useRef, useState } from 'react';

export type IframeReadyState = 'idle' | 'waiting' | 'ready' | 'error';

export interface UseIframeReadyOptions {
  /** URL of the E2B-exposed dev server. `null` keeps the hook idle. */
  url: string | null;
  /** Poll interval in ms. Defaults to 750. */
  intervalMs?: number;
  /** Max total wait in ms before giving up. Defaults to 60_000 (60s). */
  timeoutMs?: number;
}

export interface UseIframeReadyResult {
  state: IframeReadyState;
  /** Monotonic attempt count. Useful for showing a spinner with counter. */
  attempts: number;
  /** Last error message if state === 'error'. */
  error: string | null;
  /** Manually retry; resets the poll budget. */
  retry: () => void;
}

async function pingOnce(url: string, signal: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal,
    });
    if (res.status === 0 || (res.status >= 200 && res.status < 400)) {
      return true;
    }
  } catch {
    /* fall through to GET fallback */
  }
  try {
    const res = await fetch(url, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal,
    });
    return res.status === 0 || (res.status >= 200 && res.status < 400);
  } catch {
    return false;
  }
}

export function useIframeReady({
  url,
  intervalMs = 750,
  timeoutMs = 60_000,
}: UseIframeReadyOptions): UseIframeReadyResult {
  const [state, setState] = useState<IframeReadyState>('idle');
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const tickRef = useRef(0);

  useEffect(() => {
    if (!url) {
      setState('idle');
      setAttempts(0);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setState('waiting');
    setAttempts(0);
    setError(null);
    let cancelled = false;
    const startedAt = Date.now();
    const tick = ++tickRef.current;

    (async () => {
      while (!cancelled && tick === tickRef.current) {
        if (Date.now() - startedAt > timeoutMs) {
          setState('error');
          setError(`Dev server did not respond within ${timeoutMs}ms.`);
          return;
        }
        setAttempts((n) => n + 1);
        const ok = await pingOnce(url, controller.signal);
        if (cancelled || tick !== tickRef.current) return;
        if (ok) {
          setState('ready');
          return;
        }
        await new Promise((r) => setTimeout(r, intervalMs));
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [url, intervalMs, timeoutMs]);

  return {
    state,
    attempts,
    error,
    retry: () => {
      tickRef.current += 1;
      setState((s) => (s === 'idle' ? s : 'waiting'));
      setAttempts(0);
      setError(null);
    },
  };
}
