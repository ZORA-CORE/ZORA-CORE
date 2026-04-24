'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownCircle,
  Brain,
  ChevronRight,
  Code,
  FileSearch,
  Folder,
  Globe,
  Loader2,
  Pause,
  PenTool,
  Play,
  ShieldCheck,
  Sparkles,
  Terminal as TerminalIcon,
} from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
import type { ThoughtEvent } from './artifacts';

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

interface ForgeTerminalProps {
  thoughts: ThoughtEvent[];
  isStreaming: boolean;
}

type LogKind =
  | 'think'
  | 'tool'
  | 'action'
  | 'error'
  | 'info'
  | 'success';

interface LogLine {
  id: string;
  at: number;
  kind: LogKind;
  agent: string;
  message: string;
  detail?: string;
  /** Raw SSE event name, used to pick the dynamic state icon. */
  event: string;
}

const AGENT_COLOR: Record<string, string> = {
  ODIN: 'text-amber-400',
  THOR: 'text-sky-400',
  FREJA: 'text-pink-400',
  HEIMDALL: 'text-emerald-400',
  LOKI: 'text-violet-400',
  EIVOR: 'text-cyan-400',
  SWARM: 'text-neutral-400',
};

const KIND_COLOR: Record<LogKind, string> = {
  think: 'text-neutral-400',
  tool: 'text-cyan-300',
  action: 'text-sky-300',
  error: 'text-red-400',
  info: 'text-neutral-400',
  success: 'text-emerald-400',
};

/**
 * Dynamic state icon for a log line. Keyed off the raw SSE event name
 * (and — for `agent_tool_call` — the specific tool being invoked)
 * so the user can see what the agent is DOING at a glance:
 *
 *   - thinking             → Loader2 (spinning) / Brain
 *   - execute_bash         → Terminal  (pulses while streaming)
 *   - write_file           → PenTool
 *   - patch_file           → Code
 *   - read_file            → FileSearch
 *   - list_dir             → Folder
 *   - screenshot_page      → Globe
 *   - expose_port          → Globe
 *   - store_global_memory  → Sparkles
 *   - security audit       → ShieldCheck
 */
function iconFor(line: {
  event: string;
  label: string;
  kind: LogKind;
  agent: string;
  isStreaming: boolean;
}): { Icon: IconType; className: string } {
  const hay = `${line.event} ${line.label}`.toLowerCase();

  if (line.event === 'agent_thought' || line.kind === 'think') {
    return line.isStreaming
      ? { Icon: Loader2, className: 'animate-spin text-neutral-400' }
      : { Icon: Brain, className: 'text-neutral-400' };
  }
  if (hay.includes('execute_bash') || hay.includes('bash') || hay.includes('$ ')) {
    return {
      Icon: TerminalIcon,
      className: line.isStreaming
        ? 'animate-pulse text-cyan-300'
        : 'text-cyan-300',
    };
  }
  if (hay.includes('write_file') || hay.includes('wrote ')) {
    return { Icon: PenTool, className: 'text-sky-300' };
  }
  if (hay.includes('patch_file') || hay.includes('patched ')) {
    return { Icon: Code, className: 'text-sky-300' };
  }
  if (hay.includes('read_file') || hay.includes('read ')) {
    return { Icon: FileSearch, className: 'text-neutral-400' };
  }
  if (hay.includes('list_dir') || hay.includes('listed ')) {
    return { Icon: Folder, className: 'text-neutral-400' };
  }
  if (
    hay.includes('screenshot') ||
    hay.includes('expose_port') ||
    hay.includes('preview_url')
  ) {
    return { Icon: Globe, className: 'text-sky-300' };
  }
  if (hay.includes('store_global_memory') || hay.includes('global memory')) {
    return { Icon: Sparkles, className: 'text-violet-300' };
  }
  if (line.agent === 'HEIMDALL' || hay.includes('audit') || hay.includes('rls')) {
    return { Icon: ShieldCheck, className: 'text-emerald-400' };
  }
  return { Icon: ChevronRight, className: 'text-neutral-500' };
}

function inferAgent(hay: string): string {
  const s = hay.toLowerCase();
  if (s.includes('memory') || s.includes('recall') || s.includes('embed')) return 'EIVOR';
  if (s.includes('architect') || s.includes('plan') || s.includes('strategy')) return 'ODIN';
  if (
    s.includes('api') ||
    s.includes('backend') ||
    s.includes('database') ||
    s.includes('worker')
  )
    return 'THOR';
  if (s.includes('ui') || s.includes('design') || s.includes('frontend') || s.includes('component'))
    return 'FREJA';
  if (s.includes('error') || s.includes('fail') || s.includes('observ') || s.includes('log'))
    return 'HEIMDALL';
  if (s.includes('test') || s.includes('adversar') || s.includes('break')) return 'LOKI';
  return 'SWARM';
}

function thoughtToLog(t: ThoughtEvent): LogLine {
  const hay = `${t.event} ${t.label} ${t.detail ?? ''}`;
  const agent = inferAgent(hay);

  let kind: LogKind = 'info';
  let message = t.label;
  switch (t.event) {
    case 'agent_thought':
      kind = 'think';
      break;
    case 'agent_tool_call':
      kind = 'tool';
      break;
    case 'agent_tool_result':
      kind = t.label.toLowerCase().includes('error') ? 'error' : 'success';
      break;
    case 'preview_url':
      kind = 'success';
      break;
    case 'global_memory_stored':
      kind = 'success';
      break;
    case 'workflow_started':
      kind = 'action';
      message = `workflow_started — ${t.detail ?? 'workflow'}`;
      break;
    case 'workflow_finished':
      kind = t.detail?.toLowerCase().includes('error') ? 'error' : 'success';
      message = `workflow_finished — ${t.detail ?? 'done'}`;
      break;
    case 'node_started':
      kind = 'action';
      break;
    case 'node_finished':
      kind = 'success';
      break;
    case 'message_end':
      kind = 'success';
      message = 'stream_complete';
      break;
    default:
      kind = 'info';
  }

  return {
    id: t.id,
    at: t.at,
    agent,
    kind,
    message,
    detail: t.detail,
    event: t.event,
  };
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

/**
 * Devin-style live execution terminal. Renders the swarm's thought stream
 * as a scrolling monospace log with agent-colored rows and collapsible
 * `<think>` blocks for `agent_thought` events.
 *
 * Auto-follows the bottom while streaming. User can pause follow to
 * scroll up without being yanked back.
 */
export function ForgeTerminal({ thoughts, isStreaming }: ForgeTerminalProps) {
  const logs = useMemo<LogLine[]>(() => thoughts.map(thoughtToLog), [thoughts]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [follow, setFollow] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!follow) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [logs.length, follow]);

  const toggle = (id: string): void => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="relative flex h-full min-h-[320px] flex-col overflow-hidden rounded-xl border border-neutral-800 bg-[#0a0a0a] text-[12px] text-neutral-200 shadow-inner">
      <div className="flex items-center justify-between border-b border-neutral-800 bg-[#111] px-3 py-1.5">
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-400">
          <span className="h-2 w-2 rounded-full bg-red-500/70" />
          <span className="h-2 w-2 rounded-full bg-yellow-500/70" />
          <span className="h-2 w-2 rounded-full bg-green-500/70" />
          <span className="ml-2 uppercase tracking-wider">
            valhalla · execution log
          </span>
          {isStreaming && (
            <span className="ml-2 flex items-center gap-1 text-[#00CCFF]">
              <span className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00CCFF] opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00CCFF]" />
              </span>
              live
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setFollow((v) => !v)}
          className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100"
          title={follow ? 'Pause auto-follow' : 'Resume auto-follow'}
        >
          {follow ? (
            <>
              <Pause className="h-3 w-3" />
              follow
            </>
          ) : (
            <>
              <Play className="h-3 w-3" />
              paused
            </>
          )}
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 font-mono leading-5"
      >
        {logs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-neutral-500">
            <div>
              <div className="mb-1 text-[11px] uppercase tracking-wider">
                waiting for swarm
              </div>
              <div className="text-[11px] text-neutral-600">
                agent reasoning, tool calls, and file edits will stream here.
              </div>
            </div>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {logs.map((line, idx) => {
              const isOpen = expanded.has(line.id);
              const hasDetail = Boolean(line.detail && line.detail.length > 0);
              const agentClass = AGENT_COLOR[line.agent] ?? 'text-neutral-400';
              const kindClass = KIND_COLOR[line.kind];
              const isLive = isStreaming && idx === logs.length - 1;
              const { Icon: StateIcon, className: stateIconClass } = iconFor({
                event: line.event,
                label: line.message,
                kind: line.kind,
                agent: line.agent,
                isStreaming: isLive,
              });
              return (
                <li key={line.id} className="group">
                  <button
                    type="button"
                    onClick={() => (hasDetail ? toggle(line.id) : undefined)}
                    className={`flex w-full items-start gap-2 text-left ${
                      hasDetail ? 'cursor-pointer hover:bg-neutral-900/60' : 'cursor-default'
                    } rounded px-1`}
                    aria-expanded={hasDetail ? isOpen : undefined}
                  >
                    <span className="shrink-0 text-[10px] text-neutral-600">
                      {formatTime(line.at)}
                    </span>
                    {hasDetail ? (
                      <ChevronRight
                        className={`mt-0.5 h-3 w-3 shrink-0 text-neutral-500 transition-transform ${
                          isOpen ? 'rotate-90' : ''
                        }`}
                      />
                    ) : (
                      <span className="w-3" aria-hidden />
                    )}
                    <StateIcon
                      className={`mt-0.5 h-3 w-3 shrink-0 ${stateIconClass}`}
                      aria-hidden
                    />
                    <span className={`shrink-0 font-semibold ${agentClass}`}>
                      {line.agent}
                    </span>
                    <span className="shrink-0 text-neutral-600">·</span>
                    <span className={`shrink-0 text-[10px] uppercase ${kindClass}`}>
                      {line.kind}
                    </span>
                    <span className="min-w-0 flex-1 break-words text-neutral-200">
                      {line.message}
                    </span>
                  </button>
                  {hasDetail && isOpen && (
                    <pre className="ml-16 mt-1 mb-1 max-h-60 overflow-auto whitespace-pre-wrap rounded border border-neutral-800 bg-[#0f0f0f] px-2 py-1.5 text-[11px] text-neutral-400">
                      {line.detail}
                    </pre>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!follow && logs.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setFollow(true);
            const el = scrollRef.current;
            if (el) el.scrollTop = el.scrollHeight;
          }}
          className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-900/90 px-3 py-1 text-[11px] text-neutral-300 shadow transition hover:bg-neutral-800"
        >
          <ArrowDownCircle className="h-3.5 w-3.5" />
          Follow latest
        </button>
      )}
    </div>
  );
}
