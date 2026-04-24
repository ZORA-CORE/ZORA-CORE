'use client';

/**
 * `<ZeroTouchPreviewPill>` — minimal UI surface for the Master
 * Protocol's zero-touch PR flow. Shows the current state of a
 * `useZeroTouch` machine as a sticky pill above the chat input so
 * the user can see progress ("pushing → opening PR → waiting for
 * Vercel preview") and click through to the live Preview URL when
 * it's ready.
 *
 * Intentionally styled to match the ChatGPT-1:1 sidebar + forge
 * aesthetic from Master Protocol PR 1 (slate / zinc palette, subtle
 * border, no drop shadow).
 */

import type { ZeroTouchState } from '@/lib/valhalla/zero-touch/use-zero-touch';

interface Props {
  state: ZeroTouchState;
  onDismiss?: () => void;
}

function phaseLabel(state: ZeroTouchState): string {
  switch (state.phase) {
    case 'idle':
      return '';
    case 'pushing':
      return 'Pushing commit…';
    case 'opening_pr':
      return 'Opening pull request…';
    case 'awaiting_preview':
      return state.pollAttempt > 0
        ? `Waiting for Vercel preview (poll #${state.pollAttempt})…`
        : 'Waiting for Vercel preview…';
    case 'preview_ready':
      return 'Preview live';
    case 'preview_timeout':
      return 'Preview not ready yet';
    case 'done':
      return 'PR opened';
    case 'error':
      return state.error?.message ?? 'Zero-touch failed';
  }
}

export function ZeroTouchPreviewPill({ state, onDismiss }: Props): React.ReactElement | null {
  if (state.phase === 'idle') return null;
  const tone =
    state.phase === 'preview_ready'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
      : state.phase === 'error'
        ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
        : state.phase === 'preview_timeout'
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
          : 'border-zinc-700 bg-zinc-900/70 text-zinc-200';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto flex items-center gap-3 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur ${tone}`}
    >
      <span
        aria-hidden="true"
        className={
          state.phase === 'preview_ready'
            ? 'h-2 w-2 rounded-full bg-emerald-400'
            : state.phase === 'error'
              ? 'h-2 w-2 rounded-full bg-rose-400'
              : state.phase === 'preview_timeout'
                ? 'h-2 w-2 rounded-full bg-amber-400'
                : 'h-2 w-2 animate-pulse rounded-full bg-zinc-400'
        }
      />
      <span className="truncate">{phaseLabel(state)}</span>

      {state.pr && (
        <a
          href={state.pr.url}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-dotted underline-offset-2 hover:text-white"
        >
          PR #{state.pr.number}
        </a>
      )}

      {state.preview?.url && (
        <a
          href={state.preview.url}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-200 hover:bg-emerald-500/30"
        >
          Open Preview →
        </a>
      )}

      {onDismiss && (state.phase === 'preview_ready' || state.phase === 'error' || state.phase === 'preview_timeout' || state.phase === 'done') && (
        <button
          type="button"
          onClick={onDismiss}
          className="ml-1 text-zinc-400 transition hover:text-white"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}
