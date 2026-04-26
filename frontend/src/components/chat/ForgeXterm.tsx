'use client';

import { useEffect, useRef } from 'react';
import type { ThoughtEvent } from './artifacts';

/**
 * Valhalla AI — Prometheus PR 2: Frontend Supremacy.
 *
 * xterm.js-backed execution log. Bypasses React reconciliation by
 * writing raw ANSI sequences directly into the xterm canvas, which
 * is how Devin's own surface stays smooth at high event rates. The
 * caller passes the swarm thought stream; we diff the new tail
 * against what's already been written and append only the delta —
 * no full re-render, no per-event React VDOM walk.
 *
 * The xterm + xterm-addon-fit packages are SSR-hostile (they touch
 * `document` at import time), so we lazy-load them inside the
 * client-only effect.
 */

interface ForgeXtermProps {
  thoughts: ThoughtEvent[];
  isStreaming: boolean;
}

const AGENT_KEYWORDS: Array<{ pattern: RegExp; color: string; agent: string }> = [
  { pattern: /\beivor\b/i, color: '\x1b[36m', agent: 'EIVOR' },
  { pattern: /\bodin\b/i, color: '\x1b[33m', agent: 'ODIN' },
  { pattern: /\bheimdall\b/i, color: '\x1b[32m', agent: 'HEIMDALL' },
  { pattern: /\bloki\b/i, color: '\x1b[35m', agent: 'LOKI' },
  { pattern: /\bthor\b/i, color: '\x1b[34m', agent: 'THOR' },
  { pattern: /\bfreja\b/i, color: '\x1b[95m', agent: 'FREJA' },
];

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';

function classify(t: ThoughtEvent): { color: string; agent: string; tag: string } {
  const hay = `${t.event} ${t.label} ${t.detail ?? ''}`;
  for (const { pattern, color, agent } of AGENT_KEYWORDS) {
    if (pattern.test(hay)) {
      return { color, agent, tag: agent };
    }
  }
  if (t.event === 'agent_error' || /error|fail/i.test(t.label)) {
    return { color: RED, agent: 'SWARM', tag: 'ERROR' };
  }
  if (t.event === 'swarm_done') {
    return { color: GREEN, agent: 'SWARM', tag: 'DONE' };
  }
  if (/cycle/i.test(t.event)) {
    return { color: YELLOW, agent: 'SWARM', tag: 'CYCLE' };
  }
  return { color: DIM, agent: 'SWARM', tag: 'INFO' };
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(
    d.getSeconds(),
  ).padStart(2, '0')}`;
}

function formatLine(t: ThoughtEvent): string {
  const { color, agent, tag } = classify(t);
  const time = `${DIM}${formatTime(t.at)}${RESET}`;
  const head = `${color}${BOLD}${agent.padEnd(8)}${RESET} ${color}${tag}${RESET}`;
  const body = t.label;
  const detail = t.detail ? `\r\n${DIM}    ${t.detail.replace(/\n/g, '\r\n    ')}${RESET}` : '';
  return `${time}  ${head}  ${body}${detail}\r\n`;
}

export function ForgeXterm({ thoughts, isStreaming }: ForgeXtermProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // We store the xterm instance + a counter of how many thoughts
  // have already been written so subsequent renders only `write()`
  // the delta. The counter is intentionally kept on the ref (not
  // state) — touching state for every flushed delta would defeat
  // the entire point of xterm's direct-canvas pipeline.
  type XtermShape = {
    write: (data: string) => void;
    writeln: (data: string) => void;
    clear: () => void;
    dispose: () => void;
    onData: (cb: (data: string) => void) => void;
  };
  const termRef = useRef<XtermShape | null>(null);
  const fitRef = useRef<{ fit: () => void; dispose: () => void } | null>(null);
  const writtenRef = useRef(0);

  // Lazy-load xterm on mount (avoids SSR + cuts ~300 KB from
  // initial JS bundle).
  useEffect(() => {
    let cancelled = false;
    let resizeObs: ResizeObserver | null = null;

    void (async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import('xterm'),
        import('xterm-addon-fit'),
      ]);
      // The xterm CSS ships separately. Webpack will bundle it.
      await import('xterm/css/xterm.css');

      if (cancelled || !containerRef.current) return;

      const term = new Terminal({
        cursorBlink: false,
        cursorStyle: 'bar',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Cascadia Mono", monospace',
        fontSize: 12,
        lineHeight: 1.4,
        theme: {
          background: '#0a0a0a',
          foreground: '#d4d4d4',
          cursor: '#00CCFF',
          selectionBackground: 'rgba(0, 204, 255, 0.25)',
        },
        scrollback: 5_000,
        convertEol: true,
        disableStdin: true,
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(containerRef.current);
      fit.fit();

      term.writeln(
        `${DIM}valhalla · execution log · xterm.js stream${RESET}`,
      );

      termRef.current = term as unknown as XtermShape;
      fitRef.current = fit as unknown as { fit: () => void; dispose: () => void };

      // Replay any thoughts that landed before xterm finished loading.
      const pending = thoughts.slice(writtenRef.current);
      for (const t of pending) {
        term.write(formatLine(t));
      }
      writtenRef.current = thoughts.length;

      resizeObs = new ResizeObserver(() => {
        try {
          fit.fit();
        } catch {
          /* ignore — terminal disposed mid-resize */
        }
      });
      resizeObs.observe(containerRef.current);
    })();

    return () => {
      cancelled = true;
      resizeObs?.disconnect();
      try {
        fitRef.current?.dispose();
      } catch {
        /* ignore */
      }
      try {
        termRef.current?.dispose();
      } catch {
        /* ignore */
      }
      termRef.current = null;
      fitRef.current = null;
      writtenRef.current = 0;
    };
    // The thoughts dep is intentionally omitted — append-effect
    // below handles incremental writes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Append-only side-effect: write the new tail of the thought
  // stream to xterm. No state churn; no full repaint.
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    const start = writtenRef.current;
    if (start >= thoughts.length) return;
    let chunk = '';
    for (let i = start; i < thoughts.length; i += 1) {
      chunk += formatLine(thoughts[i]);
    }
    term.write(chunk);
    writtenRef.current = thoughts.length;
  }, [thoughts]);

  return (
    <div className="relative flex h-full min-h-[320px] flex-col overflow-hidden rounded-xl border border-neutral-800 bg-[#0a0a0a] text-[12px] text-neutral-200 shadow-inner">
      <div className="flex items-center justify-between border-b border-neutral-800 bg-[#111] px-3 py-1.5">
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-400">
          <span className="h-2 w-2 rounded-full bg-red-500/70" />
          <span className="h-2 w-2 rounded-full bg-yellow-500/70" />
          <span className="h-2 w-2 rounded-full bg-green-500/70" />
          <span className="ml-2 uppercase tracking-wider">
            valhalla · xterm
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
        <div className="text-[10px] text-neutral-500">{thoughts.length} events</div>
      </div>
      <div ref={containerRef} className="min-h-0 flex-1 px-2 py-1" />
    </div>
  );
}
