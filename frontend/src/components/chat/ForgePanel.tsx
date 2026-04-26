'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Code2, GitBranch, Play, Terminal, X } from 'lucide-react';
import { ForgeMermaid } from './ForgeMermaid';
import { ForgeMonaco } from './ForgeMonaco';
import { ForgeXterm } from './ForgeXterm';
import { LivePreview } from './LivePreview';
import type { Artifact, ThoughtEvent } from './artifacts';

type ForgeTab = 'code' | 'preview' | 'architecture' | 'terminal';

interface ForgePanelProps {
  artifacts: Artifact[];
  thoughts: ThoughtEvent[];
  isStreaming: boolean;
  onClose?: () => void;
}

const TAB_META: Record<ForgeTab, { label: string; Icon: typeof Code2 }> = {
  code: { label: 'Code', Icon: Code2 },
  preview: { label: 'Preview', Icon: Play },
  architecture: { label: 'Architecture', Icon: GitBranch },
  terminal: { label: 'Terminal', Icon: Terminal },
};

export function ForgePanel({
  artifacts,
  thoughts,
  isStreaming,
  onClose,
}: ForgePanelProps) {
  const codeArtifacts = useMemo(
    () => artifacts.filter((a) => a.kind === 'code'),
    [artifacts],
  );
  const mermaidArtifacts = useMemo(
    () => artifacts.filter((a) => a.kind === 'mermaid'),
    [artifacts],
  );

  // Build a map of "previous code for artifact X" so Monaco can show an
  // inline diff when the same artifact (matched by language + position)
  // is overwritten by the agent's next turn.
  const previousByArtifactId = useMemo(() => {
    const map = new Map<string, string>();
    const byLang = new Map<string, Artifact>();
    for (const a of codeArtifacts) {
      const key = (a.language || 'plaintext').toLowerCase();
      const prev = byLang.get(key);
      if (prev) map.set(a.id, prev.code);
      byLang.set(key, a);
    }
    return map;
  }, [codeArtifacts]);

  const [tab, setTab] = useState<ForgeTab>('code');
  const lastStreamingIdRef = useRef<string | null>(null);

  // Auto-switch tab when a NEW artifact starts streaming (not on every
  // render). Ref-guard ensures this fires at most once per new id.
  useEffect(() => {
    const streaming = artifacts.find((a) => a.isStreaming);
    const nextId = streaming?.id ?? null;
    if (nextId === lastStreamingIdRef.current) return;
    lastStreamingIdRef.current = nextId;
    if (!streaming) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTab(streaming.kind === 'mermaid' ? 'architecture' : 'code');
  }, [artifacts]);

  return (
    <aside className="flex h-full w-full flex-col border-l border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-[#171717]">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            The Forge
          </span>
          {isStreaming && (
            <span className="relative ml-1 inline-flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00CCFF] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00CCFF]" />
            </span>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Forge"
            className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-neutral-200 bg-neutral-50 px-3 dark:border-neutral-800 dark:bg-[#171717]">
        {(Object.keys(TAB_META) as ForgeTab[]).map((key) => {
          const { label, Icon } = TAB_META[key];
          const active = tab === key;
          const count =
            key === 'code'
              ? codeArtifacts.length
              : key === 'preview'
                ? codeArtifacts.length
                : key === 'architecture'
                  ? mermaidArtifacts.length
                  : thoughts.length;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`relative flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                active
                  ? 'bg-white text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:bg-neutral-800 dark:text-neutral-100'
                  : 'text-neutral-500 hover:bg-white hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {count > 0 && (
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    active
                      ? 'bg-[#E6FAFF] text-[#008FBF] dark:bg-[#0d3340] dark:text-[#66ddff]'
                      : 'bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <AnimatePresence mode="wait">
          {tab === 'code' && (
            <motion.div
              key="code"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-3"
            >
              {codeArtifacts.length === 0 ? (
                <ForgeEmpty
                  title="No code forged yet"
                  hint="Ask Valhalla to write a function, component, or module — it will appear here live with a full Monaco editor."
                />
              ) : (
                codeArtifacts.map((a) => (
                  <ForgeMonaco
                    key={a.id}
                    artifact={a}
                    previousCode={previousByArtifactId.get(a.id)}
                  />
                ))
              )}
            </motion.div>
          )}

          {tab === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-3"
            >
              <LivePreview artifacts={artifacts} />
            </motion.div>
          )}

          {tab === 'architecture' && (
            <motion.div
              key="architecture"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-3"
            >
              {mermaidArtifacts.length === 0 ? (
                <ForgeEmpty
                  title="No architecture diagrams yet"
                  hint='Ask for a Mermaid diagram — e.g. "draw the system architecture as a Mermaid graph".'
                />
              ) : (
                mermaidArtifacts.map((a) => (
                  <ForgeMermaid
                    key={a.id}
                    id={a.id}
                    code={a.code}
                    isStreaming={a.isStreaming}
                  />
                ))
              )}
            </motion.div>
          )}

          {tab === 'terminal' && (
            <motion.div
              key="terminal"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="h-full min-h-[320px]"
            >
              <ForgeXterm thoughts={thoughts} isStreaming={isStreaming} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}

function ForgeEmpty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col items-start gap-1 rounded-xl border border-dashed border-neutral-300 bg-white/60 p-5 dark:border-neutral-700 dark:bg-neutral-900/40">
      <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{title}</div>
      <div className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{hint}</div>
    </div>
  );
}
