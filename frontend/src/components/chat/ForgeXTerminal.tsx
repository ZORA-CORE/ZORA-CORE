'use client';

/**
 * Valhalla AI — Singularity Hotfix: xterm.js-backed Forge terminal.
 *
 * Mounts a real xterm + FitAddon instance and exposes an imperative
 * handle the parent can use to stream E2B sandbox stdout/stderr into
 * the terminal, byte-for-byte. This is the "Cursor-standard" terminal
 * the Singularity Protocol calls for — every `execute_bash` tool call
 * that the swarm runs lands here as live output with ANSI colors and
 * real cursor semantics, rather than a cosmetic log line.
 *
 * Memory discipline (Singularity pillar 5):
 *   - `term.dispose()` is called on unmount and on every thread switch
 *     via the `resetKey` prop.
 *   - The FitAddon is unregistered via `term.dispose()` (addons are
 *     owned by the terminal, so this is sufficient).
 *   - A `ResizeObserver` on the container drives fit(); the observer
 *     is disconnected on unmount.
 *   - All listeners are cleaned up in the effect's teardown.
 *
 * Gated behind `NEXT_PUBLIC_VALHALLA_XTERM=1` at the call-site — the
 * parent decides whether to render `<ForgeXTerminal>` or the legacy
 * `<ForgeTerminal>`. This keeps production shipping the known-good
 * terminal until the flag is flipped on a preview.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';

export interface ForgeXTerminalHandle {
  write(chunk: string | Uint8Array): void;
  writeln(line: string): void;
  clear(): void;
  fit(): void;
}

interface ForgeXTerminalProps {
  /** Changing this key disposes & recreates the terminal (e.g. thread switch). */
  resetKey?: string | number;
  /** Cols fallback when the container has no measurable width yet. */
  cols?: number;
  /** Rows fallback when the container has no measurable height yet. */
  rows?: number;
  className?: string;
  /** Optional onReady — fires when the terminal is mounted + fitted. */
  onReady?: (handle: ForgeXTerminalHandle) => void;
}

/**
 * Type for the dynamic xterm import. Declared narrowly so the heavy
 * module only loads in the browser and doesn't inflate the SSR bundle.
 */
interface XTermModule {
  Terminal: new (opts: Record<string, unknown>) => {
    open(el: HTMLElement): void;
    write(data: string | Uint8Array): void;
    writeln(data: string): void;
    clear(): void;
    dispose(): void;
    loadAddon(addon: unknown): void;
  };
}
interface FitAddonModule {
  FitAddon: new () => { fit(): void };
}

export const ForgeXTerminal = forwardRef<ForgeXTerminalHandle, ForgeXTerminalProps>(
  function ForgeXTerminalImpl({ resetKey, cols = 80, rows = 16, className, onReady }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const termRef = useRef<ReturnType<XTermModule['Terminal']['prototype']['open']> extends void
      ? InstanceType<XTermModule['Terminal']>
      : never>(null as unknown as InstanceType<XTermModule['Terminal']>);
    const fitRef = useRef<InstanceType<FitAddonModule['FitAddon']> | null>(null);
    const readyRef = useRef(false);

    const fit = useCallback(() => {
      try {
        fitRef.current?.fit();
      } catch {
        /* fit() throws if the element was just detached; safe to ignore. */
      }
    }, []);

    useImperativeHandle(
      ref,
      (): ForgeXTerminalHandle => ({
        write(chunk) {
          termRef.current?.write(chunk);
        },
        writeln(line) {
          termRef.current?.writeln(line);
        },
        clear() {
          termRef.current?.clear();
        },
        fit,
      }),
      [fit],
    );

    useEffect(() => {
      if (typeof window === 'undefined') return;
      const el = containerRef.current;
      if (!el) return;
      let cancelled = false;
      let ro: ResizeObserver | null = null;

      (async () => {
        const [xtermMod, fitMod] = (await Promise.all([
          import('xterm'),
          import('xterm-addon-fit'),
          // xterm ships its own stylesheet; import it lazily so the
          // SSR bundle stays xterm-free.
          import('xterm/css/xterm.css' as string),
        ])) as unknown as [XTermModule, FitAddonModule, unknown];
        if (cancelled) return;

        const term = new xtermMod.Terminal({
          cols,
          rows,
          fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
          fontSize: 12,
          lineHeight: 1.25,
          cursorBlink: true,
          convertEol: true,
          scrollback: 5000,
          theme: {
            background: '#0a0a0a',
            foreground: '#e5e5e5',
            cursor: '#00ccff',
            cursorAccent: '#0a0a0a',
            selectionBackground: '#00ccff33',
          },
        });
        const fitAddon = new fitMod.FitAddon();
        term.loadAddon(fitAddon);
        term.open(el);
        try {
          fitAddon.fit();
        } catch {
          /* swallow: element may not have measurable size on first paint */
        }

        termRef.current = term;
        fitRef.current = fitAddon;
        readyRef.current = true;

        ro = new ResizeObserver(() => {
          try {
            fitAddon.fit();
          } catch {
            /* ignore */
          }
        });
        ro.observe(el);

        term.writeln('\x1b[38;5;51mvalhalla · e2b sandbox terminal ready\x1b[0m');
        onReady?.({
          write: (chunk) => term.write(chunk),
          writeln: (line) => term.writeln(line),
          clear: () => term.clear(),
          fit,
        });
      })();

      return () => {
        cancelled = true;
        readyRef.current = false;
        if (ro) {
          try {
            ro.disconnect();
          } catch {
            /* ignore */
          }
          ro = null;
        }
        const term = termRef.current;
        if (term) {
          try {
            term.dispose();
          } catch {
            /* ignore */
          }
        }
        termRef.current = null as unknown as InstanceType<XTermModule['Terminal']>;
        fitRef.current = null;
      };
      // `resetKey` in the deps array forces dispose + remount when the
      // parent flips it (e.g. the user switches thread).
    }, [resetKey, cols, rows, onReady, fit]);

    return (
      <div
        ref={containerRef}
        className={
          className ??
          'relative h-full min-h-[240px] w-full overflow-hidden rounded-xl border border-neutral-800 bg-[#0a0a0a] p-2'
        }
      />
    );
  },
);
