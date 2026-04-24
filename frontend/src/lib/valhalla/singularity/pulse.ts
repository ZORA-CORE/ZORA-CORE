/**
 * Valhalla AI — The Pulse: ODIN's tech-debt sweep.
 *
 * One-shot Claude tool-use call that takes the AST summary (fetched
 * from Supabase) and returns a list of `TechDebtFinding` rows. Kept
 * deliberately cheap: a single forced tool invocation, no E2B, no
 * multi-turn loop. The heavy lifting (file reads, patches) only fires
 * when an operator escalates a specific finding into a swarm run.
 */

import { runClaudeTool } from '../agents/claude';
import type { AstGraphSummary, TechDebtFinding } from './store';

const SYSTEM_PROMPT = `You are ODIN, Valhalla AI's architect.
You are running a scheduled sweep (every 12 hours) over a Supabase-backed AST
graph of the ZORA CORE codebase. You see a summary of files — not their
contents — including:
  * total node / edge counts,
  * the fifteen files with the highest fan-in (many files import them),
  * the fifteen files with the highest fan-out (they import many files),
  * the fifteen most-recently modified files.

Your job is to produce a concise, honest list of tech-debt findings based on
SIGNALS VISIBLE IN THE GRAPH ALONE — do not fabricate file contents.
Valid signals:
  * very-high fan-in suggests a hotspot / god-module worth splitting,
  * very-high fan-out suggests a broker file accumulating responsibilities,
  * a file that appears in both top-15 lists is a candidate coupling risk,
  * recent churn in high-fan-in files is a priority-1 investigation.

Severity ladder:
  * info / low   — observation, no action required yet
  * medium       — worth scheduling a refactor
  * high         — clear architectural smell, plan fix this cycle
  * critical     — production risk, escalate immediately

Be selective — return AT MOST 10 findings. Empty list is valid when the
graph looks healthy. Never invent files not present in the summary.`;

const INPUT_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      maxItems: 10,
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          severity: {
            type: 'string',
            enum: ['info', 'low', 'medium', 'high', 'critical'],
          },
          category: { type: 'string' },
          title: { type: 'string' },
          reasoning: { type: 'string' },
          suggestedFix: { type: 'string' },
        },
        required: ['severity', 'category', 'title', 'reasoning'],
      },
    },
    healthSummary: { type: 'string' },
  },
  required: ['findings', 'healthSummary'],
};

interface PulseOutput {
  findings: Array<{
    path?: string;
    severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
    category: string;
    title: string;
    reasoning: string;
    suggestedFix?: string;
  }>;
  healthSummary: string;
}

export interface PulseResult {
  findings: TechDebtFinding[];
  healthSummary: string;
  usage: { input: number; output: number };
}

function formatSummary(repo: string, s: AstGraphSummary): string {
  const lines: string[] = [];
  lines.push(`Repository: ${repo}`);
  lines.push(`Total AST nodes: ${s.nodeCount} (files: ${s.fileCount})`);
  lines.push(`Total import edges: ${s.edgeCount}`);
  lines.push('');
  lines.push('Top fan-in (imported BY many files):');
  for (const r of s.topFanIn) lines.push(`  ${r.path}  <-  ${r.in}`);
  lines.push('');
  lines.push('Top fan-out (IMPORTS many files):');
  for (const r of s.topFanOut) lines.push(`  ${r.path}  ->  ${r.out}`);
  lines.push('');
  lines.push('Most-recently modified files:');
  for (const r of s.recentFiles) lines.push(`  ${r.path}  (updated ${r.updatedAt})`);
  return lines.join('\n');
}

export async function runPulseSweep(
  repo: string,
  summary: AstGraphSummary,
): Promise<PulseResult> {
  const userPrompt = `AST graph snapshot:\n\n${formatSummary(repo, summary)}`;
  const res = await runClaudeTool<PulseOutput>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    toolName: 'record_tech_debt',
    toolDescription:
      'Record a structured list of tech-debt findings derived from the AST graph summary.',
    inputSchema: INPUT_SCHEMA,
    maxTokens: 3000,
  });

  const findings: TechDebtFinding[] = res.output.findings.map((f) => ({
    repo,
    path: f.path,
    severity: f.severity,
    category: f.category,
    title: f.title,
    reasoning: f.reasoning,
    suggestedFix: f.suggestedFix,
  }));

  return {
    findings,
    healthSummary: res.output.healthSummary,
    usage: res.usage,
  };
}
