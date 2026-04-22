'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AGENT_PHASES } from './types';

interface AgentStatusPulseProps {
  active: boolean;
}

export function AgentStatusPulse({ active }: AgentStatusPulseProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    const interval = window.setInterval(() => {
      setIndex((i) => (i + 1) % AGENT_PHASES.length);
    }, 2200);
    return () => window.clearInterval(interval);
  }, [active]);

  return (
    <div
      className="flex h-6 items-center justify-center text-xs font-medium text-[#6E6E73]"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        {active ? (
          <motion.div
            key={AGENT_PHASES[index].id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-2"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00CCFF] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00CCFF]" />
            </span>
            <span className="text-[#1D1D1F]">{AGENT_PHASES[index].label}</span>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <span className="h-2 w-2 rounded-full bg-[#D2D2D7]" />
            <span>Ready</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
