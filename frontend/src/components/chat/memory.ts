/**
 * Heuristic memory extractor for the EIVOR Memory Panel.
 *
 * Dify's per-conversation "variables" aren't reliably exposed to the client,
 * so for Phase 2 we derive what the assistant has picked up about the user's
 * project from the conversation transcript itself. When a real long-term
 * memory store lands, this module is the single point to swap out.
 */

import type { ChatMessage } from './types';

const TECH_STACK_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'Next.js', re: /\bnext\.?js\b/i },
  { name: 'React', re: /\breact(?!\s?native)\b/i },
  { name: 'React Native', re: /\breact\s?native\b/i },
  { name: 'TypeScript', re: /\btypescript\b|\bts\b(?!\-?node)/i },
  { name: 'JavaScript', re: /\bjavascript\b|\bjs\b(?!on)/i },
  { name: 'Python', re: /\bpython\b|\bpy\b/i },
  { name: 'FastAPI', re: /\bfast\s?api\b/i },
  { name: 'Django', re: /\bdjango\b/i },
  { name: 'Flask', re: /\bflask\b/i },
  { name: 'Node.js', re: /\bnode\.?js\b/i },
  { name: 'Tailwind CSS', re: /\btailwind\b/i },
  { name: 'Framer Motion', re: /\bframer(-|\s)?motion\b/i },
  { name: 'PostgreSQL', re: /\bpostgres(ql)?\b/i },
  { name: 'Supabase', re: /\bsupabase\b/i },
  { name: 'Stripe', re: /\bstripe\b/i },
  { name: 'Vercel', re: /\bvercel\b/i },
  { name: 'Cloudflare', re: /\bcloudflare\b/i },
  { name: 'Docker', re: /\bdocker\b/i },
  { name: 'Kubernetes', re: /\bkubernetes\b|\bk8s\b/i },
  { name: 'AWS', re: /\baws\b/i },
  { name: 'Prisma', re: /\bprisma\b/i },
  { name: 'Rust', re: /\brust\b(?!\w)/i },
  { name: 'Go', re: /\bgolang\b|\bgo\s?\d?\.\d+\b/i },
];

const DESIGN_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'Nordic Light', re: /\bnordic(\s+light)?\b/i },
  { name: 'Glassmorphism', re: /\bglassmorph(ism|ic)\b/i },
  { name: 'Minimalist', re: /\bminimalist(ic)?\b/i },
  { name: 'Dark mode', re: /\bdark\s?mode\b|\bdark\s?theme\b/i },
  { name: 'High contrast', re: /\bhigh\s?contrast\b/i },
  { name: 'Brutalist', re: /\bbrutalist\b/i },
  { name: 'Neobrutalist', re: /\bneo-?brutalist\b/i },
];

const ERROR_KEYWORDS =
  /\b(error|failed|failure|broken|didn'?t work|doesn'?t work|not working|crash(?:ed|ing)?|500|404|bug)\b/i;

export interface MemoryFact {
  id: string;
  label: string;
  detail?: string;
  source: 'user' | 'assistant';
}

export interface MemorySnapshot {
  techStack: MemoryFact[];
  design: MemoryFact[];
  errors: MemoryFact[];
  counts: {
    turns: number;
    userMessages: number;
    assistantMessages: number;
    codeBlocks: number;
  };
}

function firstSentence(text: string, max = 160): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  const cut = trimmed.slice(0, max);
  const stop = cut.search(/[.!?](\s|$)/);
  return stop >= 20 ? cut.slice(0, stop + 1) : cut + (trimmed.length > max ? '…' : '');
}

export function extractMemory(messages: ChatMessage[]): MemorySnapshot {
  const techSeen = new Map<string, MemoryFact>();
  const designSeen = new Map<string, MemoryFact>();
  const errors: MemoryFact[] = [];

  let userMessages = 0;
  let assistantMessages = 0;
  let codeBlocks = 0;

  for (const m of messages) {
    const text = m.content || '';
    if (m.role === 'user') userMessages += 1;
    if (m.role === 'assistant') assistantMessages += 1;
    codeBlocks += (text.match(/```/g)?.length ?? 0) >> 1;

    for (const { name, re } of TECH_STACK_PATTERNS) {
      if (re.test(text) && !techSeen.has(name)) {
        techSeen.set(name, {
          id: `tech-${name}`,
          label: name,
          source: m.role,
        });
      }
    }

    for (const { name, re } of DESIGN_PATTERNS) {
      if (re.test(text) && !designSeen.has(name)) {
        designSeen.set(name, {
          id: `design-${name}`,
          label: name,
          source: m.role,
        });
      }
    }

    if (m.role === 'user' && ERROR_KEYWORDS.test(text)) {
      errors.push({
        id: `err-${m.id}`,
        label: firstSentence(text) || 'Reported error',
        detail: text.length > 160 ? text.slice(0, 300) : undefined,
        source: 'user',
      });
    }
  }

  return {
    techStack: Array.from(techSeen.values()),
    design: Array.from(designSeen.values()),
    errors,
    counts: {
      turns: Math.max(userMessages, assistantMessages),
      userMessages,
      assistantMessages,
      codeBlocks,
    },
  };
}
