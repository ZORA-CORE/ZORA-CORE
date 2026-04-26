/**
 * Valhalla AI — Prometheus PR 2: Frontend Supremacy.
 *
 * Token-streaming rAF batcher. Anthropic + the swarm orchestrator
 * emit text deltas at hundreds of events per second; React's
 * reconciler can't keep up if every delta triggers a `setState`.
 * The batcher coalesces deltas inside one `requestAnimationFrame`
 * tick (~16 ms at 60 Hz) so the chat surface stays smooth even
 * when six personas are streaming concurrently.
 *
 * Generic over payload type — used for both streamed text deltas
 * (`string`) and ThoughtEvent push (`ThoughtEvent`).
 */

export interface RafBatcher<T> {
  /** Queue an item for the next rAF flush. */
  push: (item: T) => void;
  /** Flush immediately and synchronously (used at end-of-stream). */
  flush: () => void;
  /** Drop the queue and cancel the pending rAF. */
  cancel: () => void;
}

interface BatcherOptions<T> {
  onFlush: (items: T[]) => void;
}

export function createRafBatcher<T>({ onFlush }: BatcherOptions<T>): RafBatcher<T> {
  let queue: T[] = [];
  let raf: number | null = null;

  const hasRaf =
    typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function';

  const flushNow = (): void => {
    if (raf !== null && hasRaf) {
      window.cancelAnimationFrame(raf);
      raf = null;
    }
    if (queue.length === 0) return;
    const drained = queue;
    queue = [];
    onFlush(drained);
  };

  const schedule = (): void => {
    if (raf !== null) return;
    if (!hasRaf) {
      // SSR / test environment: flush synchronously so callers
      // don't have to special-case the node path.
      flushNow();
      return;
    }
    raf = window.requestAnimationFrame(() => {
      raf = null;
      const drained = queue;
      queue = [];
      onFlush(drained);
    });
  };

  return {
    push(item) {
      queue.push(item);
      schedule();
    },
    flush: flushNow,
    cancel() {
      queue = [];
      if (raf !== null && hasRaf) {
        window.cancelAnimationFrame(raf);
        raf = null;
      }
    },
  };
}
