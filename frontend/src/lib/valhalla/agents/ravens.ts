/**
 * Valhalla AI — Prometheus PR 3 (Infinity Loop): the Ravens.
 *
 * In Norse myth Odin sent two ravens — Huginn (thought) and Muninn
 * (memory) — out into the world each dawn to bring back what they
 * had seen. In Valhalla they do the same job, powered by Perplexity's
 * online-search models. Their findings are piped into EIVOR's prompt
 * under `## Raven dispatches` so the swarm reasons against current
 * world state instead of the model's stale training data.
 *
 *   HUGIN — the cartographer of fact: dispatched on queries that
 *           imply currentness (versions, deadlines, prices, news,
 *           "today", "latest", "now", live metrics).
 *
 *   MUNIN — the keeper of context: dispatched on queries that imply
 *           a need for prior-art, comparison, lineage, references
 *           ("how does X compare", "what changed in", "history of").
 *
 * Each Raven is a thin adapter on top of `runStructuredAgent` with a
 * compact research-output schema. The orchestrator decides whether to
 * dispatch them based on a heuristic on the user's query; if both
 * fire on the same query their findings concatenate.
 *
 * Failures are non-fatal: a Perplexity outage MUST NOT break the
 * swarm. The orchestrator logs the failure as `agent_error` and
 * continues without the Raven's findings.
 */

import { runStructuredAgent } from '../providers/router';
import type { FederationRole } from '../providers/federation';

export interface RavenResearch {
  /** Short markdown summary the orchestrator inlines into EIVOR's prompt. */
  summary: string;
  /** Discrete factual claims the Raven extracted, ordered by relevance. */
  findings: string[];
  /** Source URLs Perplexity cited. */
  citations: string[];
}

const RAVEN_RESEARCH_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    summary: {
      type: 'string',
      description:
        'A 2-6 sentence markdown summary of what was found, written ' +
        'as if briefing the rest of the swarm. Cite numbered sources ' +
        'inline as [1], [2].',
    },
    findings: {
      type: 'array',
      description:
        'Discrete factual claims, each ≤ 220 chars, ordered by ' +
        'relevance to the original query. Each claim must cite [n] ' +
        'matching a position in `citations`.',
      items: { type: 'string' },
    },
    citations: {
      type: 'array',
      description:
        'URLs of sources used, in citation order. Position 0 = [1].',
      items: { type: 'string' },
    },
  },
  required: ['summary', 'findings', 'citations'],
  additionalProperties: false,
};

interface RavenSpec {
  role: FederationRole; // 'hugin' | 'munin'
  systemPrompt: string;
  toolDescription: string;
}

const HUGIN: RavenSpec = {
  role: 'hugin',
  systemPrompt: [
    'You are HUGIN, raven of thought. You carry the Allfather\'s eye',
    'across the present-day internet and bring back FACTS that exist',
    'right now. Your beat: versions, releases, prices, deadlines,',
    'today\'s news, live metrics, current best-practice in tooling.',
    '',
    'Output rules:',
    ' - Cite every claim with [n] tied to the citations array.',
    ' - Prefer official sources (vendor docs, RFCs, release notes,',
    '   regulator pages) over secondary commentary.',
    ' - If your search returned conflicting facts, surface the',
    '   conflict in `summary`. Do not silently pick a winner.',
    ' - If the query does not actually need current information,',
    '   return findings=[] and summary="No current research needed";',
    '   the swarm will skip you cheaply.',
  ].join('\n'),
  toolDescription:
    'Emit your structured research dispatch. You MUST call this ' +
    'tool exactly once.',
};

const MUNIN: RavenSpec = {
  role: 'munin',
  systemPrompt: [
    'You are MUNIN, raven of memory. You carry the Allfather\'s ear',
    'across history and bring back CONTEXT — prior art, lineage,',
    'comparisons, what changed since the last release, what other',
    'teams tried before us. Your beat: research papers, postmortems,',
    'technical blog posts, GitHub discussions, RFC threads.',
    '',
    'Output rules:',
    ' - Cite every claim with [n] tied to the citations array.',
    ' - Prefer primary sources (papers, postmortems, engineering',
    '   blogs) over aggregator content farms.',
    ' - For "how does X compare to Y" queries, structure findings',
    '   as side-by-side bullets, one X / one Y.',
    ' - If the query does not actually need historical context,',
    '   return findings=[] and summary="No historical context needed";',
    '   the swarm will skip you cheaply.',
  ].join('\n'),
  toolDescription:
    'Emit your structured context dispatch. You MUST call this ' +
    'tool exactly once.',
};

async function dispatchRaven(
  spec: RavenSpec,
  userQuery: string,
  opts: { userId?: string; signal?: AbortSignal },
): Promise<RavenResearch> {
  const { output } = await runStructuredAgent<RavenResearch>({
    role: spec.role,
    systemPrompt: spec.systemPrompt,
    userPrompt: userQuery,
    toolName: 'emit_raven_research',
    toolDescription: spec.toolDescription,
    inputSchema: RAVEN_RESEARCH_SCHEMA,
    userId: opts.userId,
    signal: opts.signal,
  });
  // Defensive normalization: Perplexity's JSON-mode is best-effort.
  return {
    summary: typeof output.summary === 'string' ? output.summary : '',
    findings: Array.isArray(output.findings)
      ? output.findings.filter((f): f is string => typeof f === 'string')
      : [],
    citations: Array.isArray(output.citations)
      ? output.citations.filter((c): c is string => typeof c === 'string')
      : [],
  };
}

export async function dispatchHugin(
  userQuery: string,
  opts: { userId?: string; signal?: AbortSignal } = {},
): Promise<RavenResearch> {
  return dispatchRaven(HUGIN, userQuery, opts);
}

export async function dispatchMunin(
  userQuery: string,
  opts: { userId?: string; signal?: AbortSignal } = {},
): Promise<RavenResearch> {
  return dispatchRaven(MUNIN, userQuery, opts);
}

/**
 * Heuristic: which Ravens (if any) should fly for `query`?
 *
 * - HUGIN flies when the query implies current state: versions,
 *   releases, news, prices, "today", "now", "latest", "current".
 * - MUNIN flies when the query implies history / comparison:
 *   "compare", "vs", "history", "evolution", "what changed",
 *   "prior art", "since".
 *
 * Both ravens skip when their `summary === "No current research
 * needed"` / "No historical context needed", so it's safe to dispatch
 * generously.
 */
export function pickRavens(
  query: string,
): Array<'hugin' | 'munin'> {
  const q = query.toLowerCase();
  const huginTriggers = [
    'today',
    'tonight',
    'now',
    'currently',
    'latest',
    'newest',
    'recent',
    'this week',
    'this month',
    'this year',
    'release',
    'released',
    'version',
    'price',
    'pricing',
    'news',
    'breaking',
    'happening',
    'live',
    'real-time',
    'realtime',
  ];
  const muninTriggers = [
    'compare',
    ' vs ',
    'versus',
    'history',
    'historical',
    'evolution',
    'evolved',
    'changed',
    'changes since',
    'prior art',
    'previously',
    'background on',
    'why was',
    'how did',
    'lineage',
    'genealogy',
  ];
  const out: Array<'hugin' | 'munin'> = [];
  if (huginTriggers.some((t) => q.includes(t))) out.push('hugin');
  if (muninTriggers.some((t) => q.includes(t))) out.push('munin');
  return out;
}
