'use client';

/**
 * XtermConsole — Cursor-grade real terminal for the Forge.
 *
 * Renders an xterm.js instance and pipes every `execute_bash`
 * tool-call's stdout and stderr into it so the user gets a true VT-100
 * console view of what THOR / FREJA / LOKI are doing inside the E2B
 * sandbox — command line, output, exit code, and all.
 *
 * The parent feeds us the same `ThoughtEvent[]` stream the ForgeTerminal
 * uses. Whenever a new `agent_thought` of kind `execute_bash` arrives
 * with a stdout / stderr / exitCode detail, we flush it into the xterm
 * buffer. The component is memoization-safe: it only writes lines it
 * hasn't already written (tracked via the last-rendered index), so
 * re-renders never duplicate output.
 */
import { useEffect, useMemo, useRef } from 'react';
import type { ThoughtEvent } from './artifacts';

interface XtermConsoleProps {
  thoughts: ThoughtEvent[];
  isStreaming: boolean;
}

interface BashLine {
  id: string;
  command?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
}

/**
 * Narrow a thought into something that resembles an execute_bash
 * tool-call. We treat any thought whose `detail` contains a command,
 * stdout, or stderr marker as a bash line. This is resilient to the
 * two event shapes we emit (Dify-style agent_thought with free-form
 * detail, and Valhalla-native agent_tool_call / agent_tool_result
 * payloads that have been serialized into `detail`).
 */
function extractBashLine(t: ThoughtEvent): BashLine | null {
  const hay = `${t.detail ?? ''}\n${t.label}`;
  if (!/bash|execute_bash|\$\s|stdout|stderr|exit/i.test(hay)) return null;
  const line: BashLine = { id: t.id };
  const cmdMatch = hay.match(/(?:command|cmd|\$)\s*[:=]?\s*(.+)/i);
  if (cmdMatch) line.command = cmdMatch[1].trim().slice(0, 400);
  const stdoutMatch = hay.match(/stdout\s*[:=]\s*([\s\S]+?)(?:\nstderr|\nexit|$)/i);
  if (stdoutMatch) line.stdout = stdoutMatch[1].trim();
  const stderrMatch = hay.match(/stderr\s*[:=]\s*([\s\S]+?)(?:\nexit|$)/i);
  if (stderrMatch) line.stderr = stderrMatch[1].trim();
  const exitMatch = hay.match(/exit(?:code)?\s*[:=]\s*(-?\d+)/i);
  if (exitMatch) line.exitCode = Number.parseInt(exitMatch[1], 10);
  // If none of the markers triggered, treat the whole detail as stdout.
  if (
    !line.command &&
    !line.stdout &&
    !line.stderr &&
    line.exitCode === undefined &&
    t.detail
  ) {
    line.stdout = t.detail;
  }
  return line;
}

export function XtermConsole({ thoughts, isStreaming }: XtermConsoleProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<unknown>(null);
  const fitRef = useRef<unknown>(null);
  const writtenCountRef = useRef(0);

  const bashLines = useMemo<BashLine[]>(() => {
    const out: BashLine[] = [];
    for (const t of thoughts) {
      const line = extractBashLine(t);
      if (line) out.push(line);
    }
    return out;
  }, [thoughts]);

  // Boot xterm once on mount. Lazy-import so Next.js SSR doesn't try
  // to load the DOM-only `@xterm/xterm` package on the server.
  useEffect(() => {
    let disposed = false;
    let cleanupListeners: (() => void) | null = null;
    (async () => {
      const { Terminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');
      // Load the xterm stylesheet on demand (only on the client).
      await import('@xterm/xterm/css/xterm.css');
      if (disposed || !containerRef.current) return;
      const term = new Terminal({
        fontFamily:
          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
        fontSize: 12,
        lineHeight: 1.35,
        cursorBlink: isStreaming,
        convertEol: true,
        scrollback: 2000,
        theme: {
          background: '#0a0a0a',
          foreground: '#e6e6e6',
          cursor: '#00CCFF',
          cursorAccent: '#0a0a0a',
          black: '#1a1a1a',
          red: '#ff6b6b',
          green: '#4ade80',
          yellow: '#facc15',
          blue: '#60a5fa',
          magenta: '#c084fc',
          cyan: '#00CCFF',
          white: '#e6e6e6',
        },
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(containerRef.current);
      try {
        fit.fit();
      } catch {
        /* container may not be sized yet */
      }
      term.writeln(
        '\x1b[36m\u2501\u2501 valhalla \u00b7 e2b sandbox terminal \u2501\u2501\x1b[0m',
      );
      term.writeln(
        '\x1b[2mStreaming stdout / stderr from THOR / FREJA / LOKI execute_bash calls.\x1b[0m',
      );
      term.writeln('');
      termRef.current = term;
      fitRef.current = fit;

      const resize = () => {
        try {
          fit.fit();
        } catch {
          /* ignore */
        }
      };
      window.addEventListener('resize', resize);
      const ro = new ResizeObserver(resize);
      ro.observe(containerRef.current);
      cleanupListeners = () => {
        window.removeEventListener('resize', resize);
        ro.disconnect();
      };
      // Re-flush any bash lines that accumulated before mount.
      flushBashLines(term, bashLines, writtenCountRef);
    })();
    return () => {
      disposed = true;
      if (cleanupListeners) cleanupListeners();
      const term = termRef.current as { dispose?: () => void } | null;
      term?.dispose?.();
      termRef.current = null;
      fitRef.current = null;
      writtenCountRef.current = 0;
    };
    // Intentionally one-shot: the xterm instance is long-lived and we
    // drive updates via the `bashLines` effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stream new bash lines into xterm as they arrive.
  useEffect(() => {
    const term = termRef.current as
      | { write: (s: string) => void; writeln: (s: string) => void }
      | null;
    if (!term) return;
    flushBashLines(term, bashLines, writtenCountRef);
  }, [bashLines]);

  return (
    <div className="relative flex h-full min-h-[320px] flex-col overflow-hidden rounded-xl border border-neutral-800 bg-[#0a0a0a] shadow-inner">
      <div className="flex items-center justify-between border-b border-neutral-800 bg-[#111] px-3 py-1.5 text-[11px] text-neutral-400">
        <div className="flex items-center gap-1.5 font-mono">
          <span className="h-2 w-2 rounded-full bg-red-500/70" />
          <span className="h-2 w-2 rounded-full bg-yellow-500/70" />
          <span className="h-2 w-2 rounded-full bg-green-500/70" />
          <span className="ml-2 uppercase tracking-wider">
            valhalla · xterm · e2b
          </span>
        </div>
        {isStreaming && (
          <span className="flex items-center gap-1 text-[#00CCFF]">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00CCFF] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00CCFF]" />
            </span>
            live
          </span>
        )}
      </div>
      <div ref={containerRef} className="min-h-0 flex-1" />
    </div>
  );
}

function flushBashLines(
  term: { write: (s: string) => void; writeln: (s: string) => void },
  lines: BashLine[],
  cursor: { current: number },
): void {
  for (let i = cursor.current; i < lines.length; i++) {
    const line = lines[i];
    if (line.command) {
      term.writeln(`\x1b[36m$ ${line.command}\x1b[0m`);
    }
    if (line.stdout) {
      for (const out of line.stdout.split('\n')) {
        term.writeln(out);
      }
    }
    if (line.stderr) {
      for (const err of line.stderr.split('\n')) {
        term.writeln(`\x1b[31m${err}\x1b[0m`);
      }
    }
    if (typeof line.exitCode === 'number') {
      const color = line.exitCode === 0 ? '\x1b[32m' : '\x1b[31m';
      term.writeln(`${color}[exit ${line.exitCode}]\x1b[0m`);
    }
    term.writeln('');
  }
  cursor.current = lines.length;
}
