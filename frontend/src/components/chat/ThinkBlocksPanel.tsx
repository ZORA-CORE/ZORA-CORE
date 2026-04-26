'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown, ChevronRight } from 'lucide-react';
import type { ThinkBlock } from './thinkBlocks';

interface ThinkBlocksPanelProps {
  blocks: ThinkBlock[];
}

/**
 * Inner-monologue panel shown above the assistant bubble. Renders
 * each `<think>...</think>` region as a collapsible reasoning
 * trace. Streaming blocks show a typing cursor and are expanded by
 * default; closed blocks collapse to a one-line summary so the
 * bubble stays clean once the answer lands.
 */
export function ThinkBlocksPanel({ blocks }: ThinkBlocksPanelProps) {
  if (blocks.length === 0) return null;
  return (
    <div className="mb-3 flex flex-col gap-1.5">
      {blocks.map((b) => (
        <ThinkBlockRow key={b.id} block={b} />
      ))}
    </div>
  );
}

function ThinkBlockRow({ block }: { block: ThinkBlock }) {
  const [open, setOpen] = useState<boolean>(block.isStreaming);
  const summary = block.text.trim().split('\n')[0]?.slice(0, 90) ?? '';

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50/70 dark:border-neutral-800 dark:bg-neutral-900/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
        )}
        <Brain
          className={`h-3.5 w-3.5 shrink-0 ${
            block.isStreaming ? 'animate-pulse text-[#00CCFF]' : 'text-neutral-500'
          }`}
        />
        <span className="uppercase tracking-wider text-[10px]">
          {block.isStreaming ? 'Thinking' : 'Reasoning trace'}
        </span>
        {!open && summary && (
          <span className="truncate text-[11px] font-normal text-neutral-500 dark:text-neutral-500">
            · {summary}
          </span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <pre className="whitespace-pre-wrap break-words border-t border-neutral-200 bg-white/40 px-3 py-2 font-mono text-[11px] leading-relaxed text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-300">
              {block.text}
              {block.isStreaming && (
                <span className="ml-0.5 inline-block h-3 w-[2px] translate-y-0.5 animate-pulse bg-[#00CCFF] align-middle" />
              )}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
