'use client';

import { useMemo, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Circle,
  Clock3,
  Code2,
  GitPullRequest,
  Globe2,
  PanelLeft,
  Radio,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import type {
  MirrorAgentName,
  MirrorEvent,
  PlannerItemStatus,
} from '@/lib/valhalla/mirror/events';

type WorkspaceTab = 'terminal' | 'editor' | 'browser' | 'git';

interface MirrorAgentModel {
  id: MirrorAgentName;
  label: string;
  role: string;
  status: 'running' | 'ready' | 'blocked';
  accent: string;
  runtime: string;
  planner: Array<{
    id: string;
    title: string;
    detail: string;
    status: PlannerItemStatus;
  }>;
  terminal: string[];
  files: Array<{ path: string; language: string; lines: number; status: string }>;
  browser: { url: string; title: string; summary: string };
}

const AGENTS: MirrorAgentModel[] = [
  {
    id: 'odin',
    label: 'ODIN',
    role: 'Lead architect · planner · reviewer',
    status: 'running',
    accent: 'from-cyan-400 to-blue-500',
    runtime: 'E2B persistent runtime',
    planner: [
      {
        id: 'odin-1',
        title: 'Establish mirror event contract',
        detail: 'Persist every planner, terminal, editor, browser, git, and CI transition.',
        status: 'completed',
      },
      {
        id: 'odin-2',
        title: 'Coordinate quad-pane workspace rollout',
        detail: 'Route all agents through the same Devin-like shell.',
        status: 'in_progress',
      },
      {
        id: 'odin-3',
        title: 'Gate privileged tools through TYR',
        detail: 'Add approval cards before destructive actions in the next rollout.',
        status: 'pending',
      },
    ],
    terminal: [
      'odin@valhalla:~$ inspect architecture',
      'schema: valhalla_agent_sessions + planner + workspace + runtime + tool_events',
      'event bus: planner_item_updated -> terminal_chunk -> browser_frame -> ci_status',
      'status: coordinating THOR and FREJA mirror runtimes',
    ],
    files: [
      { path: 'supabase/migrations/008_valhalla_cognition_mirror.sql', language: 'sql', lines: 188, status: 'created' },
      { path: 'frontend/src/lib/valhalla/mirror/events.ts', language: 'ts', lines: 282, status: 'created' },
    ],
    browser: {
      url: 'https://zoracore.dk/chat/mirror',
      title: 'Cognition Mirror Workspace',
      summary: 'ODIN watches the full session replay surface and validates event reconstruction.',
    },
  },
  {
    id: 'thor',
    label: 'THOR',
    role: 'Backend forge · terminal · CI',
    status: 'ready',
    accent: 'from-orange-400 to-red-500',
    runtime: 'Persistent bash pending gateway',
    planner: [
      {
        id: 'thor-1',
        title: 'Bind xterm to runtime stdin/stdout',
        detail: 'Upgrade the current log stream into an interactive shell.',
        status: 'pending',
      },
      {
        id: 'thor-2',
        title: 'Mount repository workspace',
        detail: 'Keep cwd, files, and branch state alive across tool calls.',
        status: 'pending',
      },
      {
        id: 'thor-3',
        title: 'Watch PR checks and repair failures',
        detail: 'Stream CI status and logs into the Git/CI pane.',
        status: 'pending',
      },
    ],
    terminal: [
      'thor@valhalla:~/repo$ npm run build',
      'awaiting persistent runtime gateway...',
      'next: terminal_send + terminal_read will replace one-shot execute_bash',
    ],
    files: [
      { path: 'frontend/src/components/chat/ForgeXterm.tsx', language: 'tsx', lines: 218, status: 'candidate' },
      { path: 'frontend/src/lib/valhalla/sandbox/e2b.ts', language: 'ts', lines: 296, status: 'candidate' },
    ],
    browser: {
      url: 'http://localhost:3000',
      title: 'Runtime Preview',
      summary: 'THOR will bind local dev servers to browser_frame events for smoke testing.',
    },
  },
  {
    id: 'freja',
    label: 'FREJA',
    role: 'Frontend forge · browser · UX QA',
    status: 'ready',
    accent: 'from-fuchsia-400 to-pink-500',
    runtime: 'Chromium feed pending gateway',
    planner: [
      {
        id: 'freja-1',
        title: 'Render Devin-like workspace shell',
        detail: 'Planner, terminal, editor, browser, and Git/CI tabs in one surface.',
        status: 'in_progress',
      },
      {
        id: 'freja-2',
        title: 'Add live browser inspection pane',
        detail: 'Stream screenshots, DOM text, console, and network events.',
        status: 'pending',
      },
      {
        id: 'freja-3',
        title: 'Run visual QA against preview URL',
        detail: 'Use browser tools before marking UI work complete.',
        status: 'pending',
      },
    ],
    terminal: [
      'freja@valhalla:~/ui$ pnpm visual-check',
      'browser feed: pending persistent Chromium session',
      'layout: agent rail + planner + workspace tabs active',
    ],
    files: [
      { path: 'frontend/src/components/valhalla-mirror/CognitionMirrorWorkspace.tsx', language: 'tsx', lines: 420, status: 'active' },
      { path: 'frontend/src/app/chat/mirror/page.tsx', language: 'tsx', lines: 20, status: 'active' },
    ],
    browser: {
      url: 'https://zoracore.dk/chat/mirror',
      title: 'Quad-Pane UI inspection',
      summary: 'FREJA verifies the workspace shell is visible before runtime wiring lands.',
    },
  },
];

const TAB_META: Record<WorkspaceTab, { label: string; Icon: typeof Terminal }> = {
  terminal: { label: 'Terminal', Icon: Terminal },
  editor: { label: 'Editor', Icon: Code2 },
  browser: { label: 'Browser', Icon: Globe2 },
  git: { label: 'PR / CI', Icon: GitPullRequest },
};

const SAMPLE_EVENTS: MirrorEvent[] = [
  {
    type: 'planner_item_created',
    agent: 'odin',
    sessionId: 'mirror-odin',
    item: {
      id: 'schema',
      title: 'Create durable mirror schema',
      status: 'completed',
      position: 1,
    },
    at: Date.now() - 120_000,
  },
  {
    type: 'terminal_chunk',
    agent: 'thor',
    sessionId: 'mirror-thor',
    terminalId: 'thor-shell',
    stream: 'stdout',
    chunk: 'npm run build -> waiting for persistent gateway',
    at: Date.now() - 75_000,
  },
  {
    type: 'browser_frame',
    agent: 'freja',
    sessionId: 'mirror-freja',
    browserId: 'freja-chrome',
    url: 'https://zoracore.dk/chat/mirror',
    title: 'Cognition Mirror',
    at: Date.now() - 30_000,
  },
];

function statusIcon(status: PlannerItemStatus) {
  if (status === 'completed') return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === 'in_progress') return <Clock3 className="h-4 w-4 animate-pulse text-cyan-300" />;
  if (status === 'blocked') return <ShieldCheck className="h-4 w-4 text-amber-300" />;
  return <Circle className="h-4 w-4 text-neutral-500" />;
}

function eventLabel(event: MirrorEvent): string {
  switch (event.type) {
    case 'planner_item_created':
      return `${event.agent.toUpperCase()} created planner item: ${event.item.title}`;
    case 'terminal_chunk':
      return `${event.agent.toUpperCase()} terminal ${event.stream}: ${event.chunk}`;
    case 'browser_frame':
      return `${event.agent.toUpperCase()} browser frame: ${event.title ?? event.url}`;
    default:
      return `${event.agent.toUpperCase()} emitted ${event.type}`;
  }
}

export function CognitionMirrorWorkspace() {
  const [activeAgentId, setActiveAgentId] = useState<MirrorAgentName>('odin');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('terminal');

  const activeAgent = useMemo(
    () => AGENTS.find((agent) => agent.id === activeAgentId) ?? AGENTS[0],
    [activeAgentId],
  );

  return (
    <div className="min-h-screen bg-[#07090d] text-neutral-100">
      <header className="border-b border-white/10 bg-black/40 px-5 py-4 backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
              <Radio className="h-4 w-4" />
              Cognition Mirror
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              Swarm of Devins Workspace
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-neutral-400">
              Quad-pane command surface for planner state, persistent runtime tools,
              live browser inspection, file edits, GitHub PRs, and CI replay.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2 text-center text-xs">
            <div className="rounded-xl bg-emerald-500/10 px-3 py-2 text-emerald-200">
              Schema ready
            </div>
            <div className="rounded-xl bg-cyan-500/10 px-3 py-2 text-cyan-200">
              Event bus typed
            </div>
            <div className="rounded-xl bg-fuchsia-500/10 px-3 py-2 text-fuchsia-200">
              UI shell live
            </div>
          </div>
        </div>
      </header>

      <main className="grid min-h-[calc(100vh-105px)] grid-cols-1 lg:grid-cols-[280px_minmax(280px,360px)_1fr]">
        <aside className="border-b border-white/10 bg-[#090c12] p-4 lg:border-b-0 lg:border-r">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
            <PanelLeft className="h-4 w-4" />
            Agents
          </div>
          <div className="space-y-2">
            {AGENTS.map((agent) => {
              const active = agent.id === activeAgent.id;
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => setActiveAgentId(agent.id)}
                  className={`w-full rounded-2xl border p-3 text-left transition ${
                    active
                      ? 'border-cyan-400/60 bg-cyan-400/10 shadow-[0_0_30px_rgba(34,211,238,0.12)]'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-xl bg-gradient-to-br ${agent.accent} p-2`}>
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">{agent.label}</div>
                        <div className="text-[11px] text-neutral-500">{agent.runtime}</div>
                      </div>
                    </div>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        agent.status === 'running'
                          ? 'bg-emerald-400'
                          : agent.status === 'blocked'
                            ? 'bg-amber-400'
                            : 'bg-cyan-400'
                      }`}
                    />
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-neutral-400">{agent.role}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
              Event replay
            </div>
            <div className="mt-3 space-y-3">
              {SAMPLE_EVENTS.map((event) => (
                <div key={`${event.type}-${event.at}`} className="text-xs text-neutral-400">
                  <div className="text-neutral-200">{eventLabel(event)}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-wider text-neutral-600">
                    {new Date(event.at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="border-b border-white/10 bg-[#0c1017] p-4 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                Planner
              </div>
              <h2 className="mt-1 text-lg font-semibold text-white">{activeAgent.label}</h2>
            </div>
            <div className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-wider text-cyan-200">
              {activeAgent.status}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {activeAgent.planner.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-3"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{statusIcon(item.status)}</div>
                  <div>
                    <div className="text-sm font-medium text-white">{item.title}</div>
                    <p className="mt-1 text-xs leading-relaxed text-neutral-400">{item.detail}</p>
                    <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-neutral-600">
                      {item.status.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-[620px] flex-col bg-[#080a0f]">
          <div className="border-b border-white/10 p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  Workspace
                </div>
                <h2 className="mt-1 text-lg font-semibold text-white">
                  {activeAgent.label} · {TAB_META[activeTab].label}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(TAB_META) as WorkspaceTab[]).map((tab) => {
                  const { Icon, label } = TAB_META[tab];
                  const active = tab === activeTab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                        active
                          ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-100'
                          : 'border-white/10 bg-white/[0.03] text-neutral-400 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 p-4">
            {activeTab === 'terminal' && (
              <div className="h-full min-h-[500px] rounded-2xl border border-white/10 bg-black p-4 font-mono text-xs text-emerald-200 shadow-inner">
                {activeAgent.terminal.map((line) => (
                  <div key={line} className="py-1">
                    {line}
                  </div>
                ))}
                <span className="mt-2 inline-block h-4 w-2 animate-pulse bg-emerald-300 align-middle" />
              </div>
            )}

            {activeTab === 'editor' && (
              <div className="grid gap-3 xl:grid-cols-[320px_1fr]">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                    Files
                  </div>
                  <div className="space-y-2">
                    {activeAgent.files.map((file) => (
                      <div key={file.path} className="rounded-xl bg-black/30 p-3">
                        <div className="break-all font-mono text-xs text-cyan-100">{file.path}</div>
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-neutral-500">
                          <span>{file.language}</span>
                          <span>·</span>
                          <span>{file.lines} lines</span>
                          <span>·</span>
                          <span>{file.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#111827] p-4 font-mono text-xs text-neutral-300">
                  <div className="mb-3 text-neutral-500">
                    {'// Monaco-backed file view placeholder'}
                  </div>
                  <pre className="whitespace-pre-wrap">{`type RuntimePane = 'terminal' | 'editor' | 'browser' | 'git';\n\nexport function DevinCloneWorkspace() {\n  return <CognitionMirrorWorkspace persistentRuntime=\"e2b\" />;\n}`}</pre>
                </div>
              </div>
            )}

            {activeTab === 'browser' && (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white">
                <div className="flex items-center gap-2 border-b border-neutral-200 bg-neutral-100 px-4 py-3">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <div className="h-3 w-3 rounded-full bg-emerald-400" />
                  <div className="ml-3 flex-1 rounded-lg bg-white px-3 py-1.5 font-mono text-xs text-neutral-500">
                    {activeAgent.browser.url}
                  </div>
                </div>
                <div className="min-h-[440px] bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-8 text-white">
                  <div className="max-w-2xl">
                    <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
                      Live Browser Feed
                    </div>
                    <h3 className="mt-4 text-3xl font-semibold">{activeAgent.browser.title}</h3>
                    <p className="mt-4 text-sm leading-relaxed text-cyan-50/75">
                      {activeAgent.browser.summary}
                    </p>
                    <div className="mt-8 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm text-cyan-50">
                      Upcoming PR: persistent Chromium frames, DOM snapshots, console logs,
                      and network events will stream here from the runtime gateway.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'git' && (
              <div className="grid gap-4 xl:grid-cols-3">
                {[
                  ['Branch', 'devin/cognition-mirror', 'Runtime work happens on a PR-only branch.'],
                  ['Pull request', 'Pending implementation PR', 'Zero-touch PR creation will wire into this pane.'],
                  ['CI', 'Awaiting checks', 'Failures will stream logs back into planner tasks.'],
                ].map(([title, value, detail]) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                      {title}
                    </div>
                    <div className="mt-3 text-lg font-semibold text-white">{value}</div>
                    <p className="mt-2 text-sm leading-relaxed text-neutral-400">{detail}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
