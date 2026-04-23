'use client';

/**
 * Neural Map — a live synaptic-web visualization of agent-to-agent
 * communication in the Valhalla swarm.
 *
 * Each Dify `ThoughtEvent` is routed to one of the 6 agents based on its
 * `event` + `label` content. A glowing edge is drawn between the previous
 * agent and the current agent (the "synaptic firing"). Recent firings
 * fade over ~4 seconds, creating a persistent-but-decaying trace.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { ThoughtEvent } from './artifacts';
import { SWARM_AGENTS, type SwarmAgentId } from './SwarmVisualizer';

interface NeuralMapProps {
  thoughts: ThoughtEvent[];
  isStreaming: boolean;
}

interface Firing {
  id: string;
  from: SwarmAgentId;
  to: SwarmAgentId;
  label: string;
  at: number;
}

/** Best-effort routing of a Dify thought event to one of the 6 agents. */
function agentForThought(t: ThoughtEvent): SwarmAgentId {
  const hay = `${t.event} ${t.label} ${t.detail ?? ''}`.toLowerCase();
  if (hay.includes('memory') || hay.includes('recall') || hay.includes('embed'))
    return 'eivor';
  if (hay.includes('architect') || hay.includes('plan') || hay.includes('strategy'))
    return 'odin';
  if (hay.includes('api') || hay.includes('backend') || hay.includes('database') || hay.includes('worker'))
    return 'thor';
  if (hay.includes('ui') || hay.includes('design') || hay.includes('component') || hay.includes('frontend'))
    return 'freja';
  if (hay.includes('error') || hay.includes('fail') || hay.includes('observ') || hay.includes('log'))
    return 'heimdall';
  if (hay.includes('tool') || hay.includes('reason') || hay.includes('node'))
    return 'loki';

  // Deterministic fallback so the same event always maps to the same agent.
  let h = 0;
  for (let i = 0; i < hay.length; i++) h = (h * 31 + hay.charCodeAt(i)) | 0;
  const idx = Math.abs(h) % SWARM_AGENTS.length;
  return SWARM_AGENTS[idx].id;
}

export function NeuralMap({ thoughts, isStreaming }: NeuralMapProps) {
  const width = 520;
  const height = 380;
  const cx = width / 2;
  const cy = height / 2;
  const rx = width / 2 - 60;
  const ry = height / 2 - 60;

  const nodes = useMemo(() => {
    return SWARM_AGENTS.map((agent, i) => {
      const angle = (Math.PI * 2 * i) / SWARM_AGENTS.length - Math.PI / 2;
      return {
        ...agent,
        x: cx + Math.cos(angle) * rx,
        y: cy + Math.sin(angle) * ry,
      };
    });
  }, [cx, cy, rx, ry]);

  const nodeById = useMemo(() => {
    const m = new Map<SwarmAgentId, (typeof nodes)[number]>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  const [firings, setFirings] = useState<Firing[]>([]);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  const lastThoughtCountRef = useRef(0);
  const lastAgentRef = useRef<SwarmAgentId | null>(null);

  // Append a new firing every time a new thought arrives.
  useEffect(() => {
    const prevCount = lastThoughtCountRef.current;
    if (thoughts.length <= prevCount) {
      lastThoughtCountRef.current = thoughts.length;
      return;
    }
    const fresh = thoughts.slice(prevCount);
    lastThoughtCountRef.current = thoughts.length;

    setFirings((prev) => {
      const next = [...prev];
      for (const t of fresh) {
        const to = agentForThought(t);
        const from = lastAgentRef.current ?? to;
        lastAgentRef.current = to;
        next.push({ id: `f-${t.id}`, from, to, label: t.label, at: Date.now() });
      }
      // Keep only the most recent 40 firings for perf.
      return next.slice(-40);
    });
  }, [thoughts]);

  // Tick `nowTick` and decay old firings on a single interval so we don't
  // call Date.now() during render (react-hooks/purity).
  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();
      setNowTick(now);
      const cutoff = now - 4200;
      setFirings((prev) => {
        if (prev.length === 0) return prev;
        const trimmed = prev.filter((f) => f.at > cutoff);
        return trimmed.length === prev.length ? prev : trimmed;
      });
    }, 300);
    return () => window.clearInterval(interval);
  }, []);

  const activeAgents = useMemo(() => {
    const recent = firings.filter((f) => nowTick - f.at < 1400);
    const ids = new Set<SwarmAgentId>();
    for (const f of recent) {
      ids.add(f.to);
      ids.add(f.from);
    }
    return ids;
  }, [firings, nowTick]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-[#1D1D1F]">
          Reasoning Trace
          <span className="ml-2 text-[10px] font-normal uppercase tracking-wider text-[#9b9ba3]">
            {firings.length} synaptic firing{firings.length === 1 ? '' : 's'}
          </span>
        </div>
        {isStreaming && (
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#00CCFF]">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00CCFF] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00CCFF]" />
            </span>
            Live
          </span>
        )}
      </div>

      <div className="relative overflow-hidden rounded-xl border border-[#EAEAEC] bg-gradient-to-br from-white via-[#FAFBFC] to-[#F5F8FA]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-auto w-full"
          role="img"
          aria-label="Neural map of agent reasoning"
        >
          <defs>
            <radialGradient id="nm-hub-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00CCFF" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#00CCFF" stopOpacity="0" />
            </radialGradient>
            <filter id="nm-soft-glow">
              <feGaussianBlur stdDeviation="2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background hub glow */}
          <circle cx={cx} cy={cy} r={90} fill="url(#nm-hub-glow)" />

          {/* Baseline mesh — faint edges between every pair of agents */}
          {nodes.map((a, i) =>
            nodes
              .slice(i + 1)
              .map((b) => (
                <line
                  key={`${a.id}-${b.id}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="#EAEAEC"
                  strokeWidth={0.6}
                  opacity={0.45}
                />
              )),
          )}

          {/* Active firings */}
          {firings.map((f) => {
            const a = nodeById.get(f.from);
            const b = nodeById.get(f.to);
            if (!a || !b) return null;
            const age = nowTick - f.at;
            const t = Math.max(0, Math.min(1, age / 4000));
            const opacity = 0.85 * (1 - t);
            const strokeWidth = 1 + 1.8 * (1 - t);
            return (
              <motion.line
                key={f.id}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="#00CCFF"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                opacity={opacity}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                filter="url(#nm-soft-glow)"
              />
            );
          })}

          {/* Central hub */}
          <circle cx={cx} cy={cy} r={4} fill="#1D1D1F" opacity={0.85} />

          {/* Nodes */}
          {nodes.map((n) => {
            const active = activeAgents.has(n.id);
            return (
              <g key={n.id}>
                {active && (
                  <motion.circle
                    cx={n.x}
                    cy={n.y}
                    r={10}
                    fill="#00CCFF"
                    initial={{ opacity: 0.5, r: 10 }}
                    animate={{ opacity: 0, r: 26 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={active ? 7 : 5}
                  fill={active ? '#00CCFF' : '#ffffff'}
                  stroke={active ? '#00CCFF' : '#D2D2D7'}
                  strokeWidth={1.4}
                />
                <text
                  x={n.x}
                  y={n.y + (n.y > cy ? 20 : -13)}
                  textAnchor="middle"
                  className="font-mono"
                  fontSize="10"
                  fill={active ? '#008FBF' : '#9b9ba3'}
                  style={{ letterSpacing: '0.08em' }}
                >
                  {n.label}
                </text>
                <text
                  x={n.x}
                  y={n.y + (n.y > cy ? 33 : -26)}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#9b9ba3"
                  opacity={0.7}
                >
                  {n.role}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Recent event ticker */}
      <div className="max-h-32 overflow-y-auto rounded-lg border border-[#EAEAEC] bg-white/70 p-2 text-[11px]">
        {firings.length === 0 ? (
          <div className="px-1 py-1.5 text-[#9b9ba3]">
            No reasoning events yet. Events appear here as the swarm thinks.
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {[...firings]
              .reverse()
              .slice(0, 12)
              .map((f) => {
                const fromAgent = SWARM_AGENTS.find((a) => a.id === f.from);
                const toAgent = SWARM_AGENTS.find((a) => a.id === f.to);
                return (
                  <li
                    key={f.id}
                    className="flex items-center gap-1.5 font-mono text-[10px] text-[#6E6E73]"
                  >
                    <span className="text-[#008FBF]">{fromAgent?.label}</span>
                    <span className="text-[#D2D2D7]">→</span>
                    <span className="text-[#008FBF]">{toAgent?.label}</span>
                    <span className="text-[#9b9ba3]">· {f.label}</span>
                  </li>
                );
              })}
          </ul>
        )}
      </div>
    </div>
  );
}
