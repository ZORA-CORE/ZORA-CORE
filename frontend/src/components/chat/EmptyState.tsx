'use client';

import { motion } from 'framer-motion';
import { Building2, Code2, Library, Sparkles } from 'lucide-react';

export interface QuickStartCard {
  title: string;
  description: string;
  prompt: string;
  icon: 'fintech' | 'library' | 'code' | 'sparkles';
}

const ICONS = {
  fintech: Building2,
  library: Library,
  code: Code2,
  sparkles: Sparkles,
};

export const DEFAULT_QUICK_STARTS: QuickStartCard[] = [
  {
    title: 'Build a Fintech App',
    description: 'A secure, modern banking interface with Stripe and KYC flows.',
    prompt:
      'Design the architecture for a climate-aligned fintech app, including payments, KYC, and a carbon ledger.',
    icon: 'fintech',
  },
  {
    title: 'Create a Library System',
    description: 'Catalog, borrowing, and reservations for a modern library.',
    prompt:
      'Architect a library management system with a catalog, reservations, and member accounts.',
    icon: 'library',
  },
  {
    title: 'Forge a Nordic Landing Page',
    description: 'A premium, airy marketing page in the Valhalla aesthetic.',
    prompt:
      'Generate a Nordic minimalist landing page in Next.js + Tailwind for an AI software agency.',
    icon: 'sparkles',
  },
  {
    title: 'Refactor a Legacy API',
    description: 'Plan a clean migration from a monolith to edge functions.',
    prompt:
      'Plan a step-by-step migration from a Node.js monolith to edge functions on Vercel.',
    icon: 'code',
  },
];

interface EmptyStateProps {
  cards?: QuickStartCard[];
  onSelect: (prompt: string) => void;
}

export function EmptyState({
  cards = DEFAULT_QUICK_STARTS,
  onSelect,
}: EmptyStateProps) {
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="mb-10 flex flex-col items-center text-center"
      >
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)] dark:border-neutral-800 dark:bg-[#2A2A2A] dark:shadow-none">
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M16 3 L29 10 V22 L16 29 L3 22 V10 Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
              className="text-neutral-900 dark:text-neutral-100"
            />
            <path
              d="M16 9 L23 13 V19 L16 23 L9 19 V13 Z"
              stroke="#00CCFF"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-4xl">
          Valhalla AI
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-neutral-500 dark:text-neutral-400">
          Forging Future Systems through Divine Nordic Intelligence.
        </p>
      </motion.div>

      <div className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
        {cards.map((card, i) => {
          const Icon = ICONS[card.icon];
          return (
            <motion.button
              key={card.title}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * i, ease: 'easeOut' }}
              whileHover={{ y: -2 }}
              onClick={() => onSelect(card.prompt)}
              className="group flex flex-col items-start gap-2 rounded-2xl border border-neutral-200 bg-white p-5 text-left transition hover:border-[#00CCFF]/60 hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,204,255,0.35)] dark:border-neutral-800 dark:bg-[#2A2A2A] dark:hover:border-[#00CCFF]/60"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-900 transition group-hover:bg-[#E6FAFF] group-hover:text-[#008FBF] dark:bg-neutral-800 dark:text-neutral-100 dark:group-hover:bg-[#0d3340] dark:group-hover:text-[#66ddff]">
                <Icon className="h-4.5 w-4.5" size={18} />
              </div>
              <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{card.title}</div>
              <div className="text-xs leading-5 text-neutral-500 dark:text-neutral-400">{card.description}</div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
