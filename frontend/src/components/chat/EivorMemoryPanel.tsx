'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Brain, Palette, Layers, X } from 'lucide-react';
import type { MemorySnapshot } from './memory';

interface EivorMemoryPanelProps {
  open: boolean;
  memory: MemorySnapshot;
  onClose: () => void;
}

/**
 * Toggleable side drawer showing what Valhalla currently "knows" about the
 * user's project: detected tech stack, design preferences, and reported
 * errors, plus simple conversation counters.
 */
export function EivorMemoryPanel({
  open,
  memory,
  onClose,
}: EivorMemoryPanelProps) {
  const { techStack, design, errors, counts } = memory;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="eivor-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            key="eivor-drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="fixed inset-y-0 left-0 z-50 flex w-full max-w-[380px] flex-col border-r border-[#EAEAEC] bg-white/90 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.18)] backdrop-blur-xl"
            aria-label="EIVOR memory panel"
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#EAEAEC] px-5">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-[#00CCFF]" />
                <span className="text-sm font-semibold tracking-tight text-[#1D1D1F]">
                  EIVOR Memory
                </span>
                <span className="rounded-full bg-[#F5F5F7] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#6E6E73]">
                  beta
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close EIVOR memory"
                className="flex h-7 w-7 items-center justify-center rounded-md text-[#6E6E73] transition hover:bg-[#F0F0F2] hover:text-[#1D1D1F]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <p className="mb-5 text-xs leading-5 text-[#6E6E73]">
                What the Valhalla swarm currently knows about your project,
                derived from this conversation.
              </p>

              <MemorySection
                Icon={Layers}
                title="Tech stack"
                emptyHint="Mention a framework or tool (e.g. Next.js, FastAPI) and it'll land here."
                facts={techStack}
              />

              <MemorySection
                Icon={Palette}
                title="Design preferences"
                emptyHint="Nordic, minimalist, glassmorphism… tell the swarm your taste."
                facts={design}
              />

              <MemorySection
                Icon={AlertTriangle}
                title="Reported errors"
                emptyHint="When you flag something that didn't work, it'll be remembered here."
                facts={errors}
                danger
              />

              <div className="mt-6 border-t border-[#F0F0F2] pt-4">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#9b9ba3]">
                  Session stats
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <Stat label="Turns" value={counts.turns} />
                  <Stat label="Code blocks" value={counts.codeBlocks} />
                  <Stat label="You said" value={counts.userMessages} />
                  <Stat label="Swarm said" value={counts.assistantMessages} />
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

interface MemorySectionProps {
  Icon: typeof Brain;
  title: string;
  emptyHint: string;
  facts: { id: string; label: string; detail?: string }[];
  danger?: boolean;
}

function MemorySection({
  Icon,
  title,
  emptyHint,
  facts,
  danger,
}: MemorySectionProps) {
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#6E6E73]">
        <Icon className="h-3.5 w-3.5 text-[#1D1D1F]" />
        {title}
        {facts.length > 0 && (
          <span className="rounded-full bg-[#F5F5F7] px-1.5 py-0.5 text-[10px] font-semibold text-[#6E6E73]">
            {facts.length}
          </span>
        )}
      </div>
      {facts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#EAEAEC] bg-white/60 px-3 py-2.5 text-[11px] leading-5 text-[#9b9ba3]">
          {emptyHint}
        </div>
      ) : danger ? (
        <ul className="flex flex-col gap-1.5">
          {facts.map((f) => (
            <li
              key={f.id}
              className="rounded-lg border border-red-200/80 bg-red-50/60 px-3 py-2 text-[11px] leading-5 text-red-700"
            >
              {f.label}
              {f.detail && (
                <div className="mt-0.5 text-[10px] text-red-600/80">
                  {f.detail}
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {facts.map((f) => (
            <span
              key={f.id}
              className="rounded-full border border-[#EAEAEC] bg-white px-2.5 py-1 text-[11px] font-medium text-[#1D1D1F]"
            >
              {f.label}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[#EAEAEC] bg-white px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-[#9b9ba3]">
        {label}
      </div>
      <div className="text-sm font-semibold text-[#1D1D1F]">{value}</div>
    </div>
  );
}
