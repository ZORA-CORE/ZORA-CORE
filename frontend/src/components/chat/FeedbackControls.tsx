'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bug, ThumbsDown, ThumbsUp, X } from 'lucide-react';

interface FeedbackControlsProps {
  messageId: string;
  difyMessageId?: string;
  userId: string;
  current?: 'like' | 'dislike' | null;
  onChange: (next: 'like' | 'dislike' | null) => void;
}

/**
 * The 'Correct the Gods' control — thumbs up / thumbs down on every
 * assistant message. Thumbs-down opens a tiny popover with a preset
 * "This didn't work in Cursor" button plus a free-text box. The rating
 * (and optional text) is forwarded to Dify as a feedback entry so the
 * long-term-memory loop can learn from the user's corrections.
 */
export function FeedbackControls({
  messageId,
  difyMessageId,
  userId,
  current = null,
  onChange,
}: FeedbackControlsProps) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = !difyMessageId;

  const submit = async (
    rating: 'like' | 'dislike' | null,
    content?: string,
  ): Promise<void> => {
    if (!difyMessageId) {
      setError('Waiting for the swarm to finish responding…');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_id: difyMessageId,
          user: userId,
          rating,
          ...(content ? { content } : {}),
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let msg = text;
        try {
          const parsed = JSON.parse(text) as {
            error?: string;
            message?: string;
          };
          msg = parsed.error || parsed.message || text;
        } catch {
          /* ignore */
        }
        throw new Error(msg || `Feedback failed (${res.status}).`);
      }
      onChange(rating);
      setExpanded(false);
      setDetail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUp = (): void => {
    if (current === 'like') void submit(null);
    else void submit('like');
  };

  const handleDownToggle = (): void => {
    if (current === 'dislike') {
      void submit(null);
      return;
    }
    setExpanded((v) => !v);
  };

  return (
    <div className="mt-1.5 flex flex-col items-start gap-1">
      <div className="flex items-center gap-1">
        <IconPill
          active={current === 'like'}
          disabled={disabled || submitting}
          onClick={handleUp}
          title="Useful"
          accent="positive"
        >
          <ThumbsUp className="h-3 w-3" />
        </IconPill>
        <IconPill
          active={current === 'dislike'}
          disabled={disabled || submitting}
          onClick={handleDownToggle}
          title="Correct the Gods"
          accent="negative"
        >
          <ThumbsDown className="h-3 w-3" />
        </IconPill>
        {current === 'like' && (
          <span
            key={messageId + '-like'}
            className="text-[10px] font-medium text-emerald-600"
          >
            Thanks — logged.
          </span>
        )}
        {current === 'dislike' && !expanded && (
          <span className="text-[10px] font-medium text-red-600">
            Logged to EIVOR memory.
          </span>
        )}
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="correct-the-gods"
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-[520px] overflow-hidden"
          >
            <div className="rounded-lg border border-red-200 bg-red-50/70 px-3 py-2.5 text-[11px]">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-semibold uppercase tracking-wider text-red-700">
                  Correct the Gods
                </span>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  aria-label="Close feedback"
                  className="flex h-4 w-4 items-center justify-center rounded-full text-red-400 transition hover:bg-red-100 hover:text-red-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <p className="mb-2 text-red-700/90">
                What went wrong? This goes into EIVOR's long-term memory so the
                swarm doesn't repeat it.
              </p>
              <button
                type="button"
                onClick={() => void submit('dislike', "This didn't work in Cursor.")}
                disabled={submitting}
                className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-white px-2.5 py-1 text-[11px] font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
              >
                <Bug className="h-3 w-3" />
                This didn't work in Cursor
              </button>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="Or type the exact issue…"
                rows={2}
                className="w-full resize-none rounded-md border border-red-200 bg-white px-2 py-1.5 text-[12px] text-red-900 placeholder:text-red-300 focus:border-red-400 focus:outline-none"
              />
              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExpanded(false);
                    setDetail('');
                  }}
                  disabled={submitting}
                  className="rounded-md px-2 py-1 text-[11px] font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void submit('dislike', detail.trim() || undefined)}
                  disabled={submitting}
                  className="rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {submitting ? 'Sending…' : 'Send to EIVOR'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <span className="text-[10px] font-medium text-red-600">{error}</span>
      )}
    </div>
  );
}

interface IconPillProps {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  accent: 'positive' | 'negative';
  children: React.ReactNode;
}

function IconPill({
  active,
  disabled,
  onClick,
  title,
  accent,
  children,
}: IconPillProps) {
  const activeStyle =
    accent === 'positive'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-red-50 text-red-700 border-red-200';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={title}
      title={title}
      aria-pressed={active}
      className={`flex h-6 w-6 items-center justify-center rounded-md border transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? activeStyle
          : 'border-transparent text-[#9b9ba3] hover:border-[#EAEAEC] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]'
      }`}
    >
      {children}
    </button>
  );
}
