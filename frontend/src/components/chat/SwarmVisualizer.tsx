'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

export const SWARM_AGENTS = [
  { id: 'eivor', label: 'EIVOR', role: 'Memory' },
  { id: 'odin', label: 'ODIN', role: 'Strategy' },
  { id: 'thor', label: 'THOR', role: 'Backend' },
  { id: 'freja', label: 'FREJA', role: 'Frontend' },
  { id: 'heimdall', label: 'HEIMDALL', role: 'Observability' },
  { id: 'loki', label: 'LOKI', role: 'Dynamics' },
] as const;

export type SwarmAgentId = (typeof SWARM_AGENTS)[number]['id'];

interface SwarmVisualizerProps {
  /** Whether a request is currently streaming. When true, the active node cycles. */
  active: boolean;
  /** Optional: force a specific agent to glow (overrides the auto-cycle). */
  activeAgent?: SwarmAgentId | null;
  /** Compact height, for use in the chat footer. Default 96px. */
  height?: number;
}

/**
 * Animated 'Swarm' — the 6 agents arranged as a hexagon around a central hub.
 * When a request is streaming, the active node glows cyan and its link to the
 * hub pulses. Idle state shows a muted, still graph.
 */
export function SwarmVisualizer({
  active,
  activeAgent = null,
  height = 96,
}: SwarmVisualizerProps) {
  const [cycleIdx, setCycleIdx] = useState(0);

  useEffect(() => {
    if (!active || activeAgent) return;
    const interval = window.setInterval(() => {
      setCycleIdx((i) => (i + 1) % SWARM_AGENTS.length);
    }, 1800);
    return () => window.clearInterval(interval);
  }, [active, activeAgent]);

  const activeId: SwarmAgentId | null = activeAgent
    ? activeAgent
    : active
      ? SWARM_AGENTS[cycleIdx].id
      : null;

  const activeLabel = useMemo(() => {
    if (!activeId) return null;
    return SWARM_AGENTS.find((a) => a.id === activeId) ?? null;
  }, [activeId]);

  // Hexagonal layout around a central hub.
  const centerX = 180;
  const centerY = height / 2;
  const radiusX = 150;
  const radiusY = height / 2 - 14;
  const nodes = SWARM_AGENTS.map((agent, i) => {
    const angle = (Math.PI * 2 * i) / SWARM_AGENTS.length - Math.PI / 2;
    const x = centerX + Math.cos(angle) * radiusX;
    const y = centerY + Math.sin(angle) * radiusY;
    return { ...agent, x, y };
  });

  return (
    <div
      className="relative mx-auto w-full max-w-[360px]"
      style={{ height }}
      aria-live="polite"
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 360 ${height}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        {/* Connective lines from each node to the hub */}
        {nodes.map((n) => {
          const isActive = n.id === activeId;
          return (
            <line
              key={`l-${n.id}`}
              x1={n.x}
              y1={n.y}
              x2={centerX}
              y2={centerY}
              stroke={isActive ? '#00CCFF' : '#EAEAEC'}
              strokeWidth={isActive ? 1.5 : 1}
              strokeLinecap="round"
              opacity={isActive ? 0.85 : 0.6}
            />
          );
        })}

        {/* Central hub */}
        <circle
          cx={centerX}
          cy={centerY}
          r={5}
          fill="#1D1D1F"
          opacity={0.9}
        />
        {active && (
          <motion.circle
            cx={centerX}
            cy={centerY}
            r={5}
            fill="none"
            stroke="#00CCFF"
            strokeWidth={1.2}
            initial={{ r: 5, opacity: 0.8 }}
            animate={{ r: 14, opacity: 0 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
          />
        )}

        {/* Agent nodes */}
        {nodes.map((n) => {
          const isActive = n.id === activeId;
          return (
            <g key={n.id}>
              {isActive && (
                <motion.circle
                  cx={n.x}
                  cy={n.y}
                  r={8}
                  fill="#00CCFF"
                  initial={{ opacity: 0.4, r: 8 }}
                  animate={{ opacity: 0, r: 22 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
              <circle
                cx={n.x}
                cy={n.y}
                r={isActive ? 6 : 4}
                fill={isActive ? '#00CCFF' : '#ffffff'}
                stroke={isActive ? '#00CCFF' : '#D2D2D7'}
                strokeWidth={1.4}
              />
              <text
                x={n.x}
                y={n.y + (n.y > centerY ? 16 : -9)}
                textAnchor="middle"
                className="font-mono"
                fontSize="9"
                fill={isActive ? '#008FBF' : '#9b9ba3'}
                style={{ letterSpacing: '0.08em' }}
              >
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Status caption */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center text-[11px] font-medium">
        {activeLabel ? (
          <span className="flex items-center gap-1.5 text-[#1D1D1F]">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00CCFF] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00CCFF]" />
            </span>
            <span className="uppercase tracking-wider">
              {activeLabel.label} · {activeLabel.role}
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[#6E6E73]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D2D2D7]" />
            <span className="uppercase tracking-wider">Swarm idle</span>
          </span>
        )}
      </div>
    </div>
  );
}
