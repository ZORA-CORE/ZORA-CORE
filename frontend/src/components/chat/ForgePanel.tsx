'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Code2, GitBranch, ScrollText, X } from 'lucide-react';
import { CodeBlock } from './CodeBlock';
import { ForgeMermaid } from './ForgeMermaid';
import type { Artifact, ThoughtEvent } from './artifacts';

type ForgeTab = 'code' | 'architecture' | 'log';

interface ForgePanelProps {
  artifacts: Artifact[];
  thoughts: ThoughtEvent[];
  isStreaming: boolean;
  onClose?: () => void;
}

const TAB_META: Record<ForgeTab, { label: string; Icon: typeof Code2 }> = {
  code: { label: 'Code', Icon: Code2 },
  architecture: { label: 'Architecture', Icon: GitBranch },
  log: { label: 'Execution Log', Icon: ScrollText },
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

  const [tab, setTab] = useState<ForgeTab>('code');
  const lastStreamingIdRef = useRef<string | null>(null);

  // Auto-switch tab when a NEW artifact starts streaming (not on every render).
  // The ref-guard ensures this fires at most once per new artifact id, so
  // cascading renders aren't a real risk here despite the lint rule.
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
    <aside className="flex h-full w-full flex-col border-l border-[#EAEAEC] bg-[#FAFBFC]/80 backdrop-blur-xl">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#EAEAEC] px-4">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#6E6E73]">
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
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#6E6E73] transition hover:bg-[#F0F0F2] hover:text-[#1D1D1F]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-[#EAEAEC] px-3">
        {(Object.keys(TAB_META) as ForgeTab[]).map((key) => {
          const { label, Icon } = TAB_META[key];
          const active = tab === key;
          const count =
            key === 'code'
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
                  ? 'bg-white text-[#1D1D1F] shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                  : 'text-[#6E6E73] hover:bg-white hover:text-[#1D1D1F]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {count > 0 && (
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    active
                      ? 'bg-[#E6FAFF] text-[#008FBF]'
                      : 'bg-[#F0F0F2] text-[#6E6E73]'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
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
                  hint="Ask Valhalla to write a function, component, or module — it will appear here live as Thor types."
                />
              ) : (
                codeArtifacts.map((a) => (
                  <div key={a.id}>
                    <CodeBlock language={a.language} value={a.code} />
                    {a.isStreaming && (
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#00CCFF]">
                        <span className="relative inline-flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00CCFF] opacity-60" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00CCFF]" />
                        </span>
                        Streaming…
                      </div>
                    )}
                  </div>
                ))
              )}
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

          {tab === 'log' && (
            <motion.div
              key="log"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-2 font-mono text-[11px] leading-5"
            >
              {thoughts.length === 0 ? (
                <ForgeEmpty
                  title="No execution trace yet"
                  hint="When Valhalla's agents reason or recall memories, their thoughts will appear here in real-time."
                />
              ) : (
                thoughts.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-lg border border-[#EAEAEC] bg-white px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-sans text-[11px] font-semibold text-[#1D1D1F]">
                        {t.label}
                      </span>
                      <span className="font-sans text-[10px] text-[#9b9ba3]">
                        {t.event}
                      </span>
                    </div>
                    {t.detail && (
                      <pre className="mt-1 whitespace-pre-wrap text-[11px] text-[#6E6E73]">
                        {t.detail}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}

function ForgeEmpty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col items-start gap-1 rounded-xl border border-dashed border-[#EAEAEC] bg-white/60 p-5">
      <div className="text-sm font-medium text-[#1D1D1F]">{title}</div>
      <div className="text-xs leading-5 text-[#6E6E73]">{hint}</div>
    </div>
  );
}
