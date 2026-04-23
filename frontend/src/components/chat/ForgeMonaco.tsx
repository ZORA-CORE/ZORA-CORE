'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { Check, Copy, Edit3, Eye } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import type { Artifact } from './artifacts';

// Monaco is ~2MB; load it only on demand. Disable SSR to avoid
// `window is not defined` during Next.js build.
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then((m) => m.Editor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-80 items-center justify-center text-xs text-neutral-500 dark:text-neutral-400">
        Loading editor…
      </div>
    ),
  },
);

const DiffEditor = dynamic(
  () => import('@monaco-editor/react').then((m) => m.DiffEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-80 items-center justify-center text-xs text-neutral-500 dark:text-neutral-400">
        Loading diff…
      </div>
    ),
  },
);

// Monaco uses a different set of language ids than the Markdown fences
// (e.g. `ts` vs `typescript`). This maps the common ones so syntax
// highlighting works for the artifacts our agents emit.
const LANGUAGE_MAP: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  rb: 'ruby',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  yml: 'yaml',
  md: 'markdown',
  'c++': 'cpp',
  'c#': 'csharp',
  rs: 'rust',
  go: 'go',
};

function monacoLanguage(language: string): string {
  const key = language.trim().toLowerCase();
  return LANGUAGE_MAP[key] ?? (key || 'plaintext');
}

interface ForgeMonacoProps {
  artifact: Artifact;
  /**
   * Optional previous version of the same artifact (by file path / id).
   * When provided, the component renders an inline diff instead of a
   * read-only view.
   */
  previousCode?: string;
}

/**
 * Single-artifact viewer built on Monaco. Supports:
 *  - read-only display with copy + language-aware syntax highlighting
 *  - a toggleable inline diff view against a previous version
 *  - `dark:` theme binding via <ThemeProvider>
 *
 * Editing is intentionally not wired back into the swarm in PR 1 — the
 * editor is a viewer with diff support. PR 2 picks up the bi-directional
 * "edit and re-run" flow.
 */
export function ForgeMonaco({ artifact, previousCode }: ForgeMonacoProps) {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);
  const [showDiff, setShowDiff] = useState<boolean>(Boolean(previousCode));
  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs';

  const language = useMemo(() => monacoLanguage(artifact.language), [artifact.language]);
  const canDiff = typeof previousCode === 'string' && previousCode !== artifact.code;

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(artifact.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore clipboard failures */
    }
  };

  const lineCount = artifact.code.split('\n').length;

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#1e1e1e]">
      <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs dark:border-neutral-800 dark:bg-[#252526]">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {artifact.language || 'code'}
          </span>
          <span className="text-neutral-400 dark:text-neutral-600">·</span>
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {lineCount} line{lineCount === 1 ? '' : 's'}
          </span>
          {artifact.isStreaming && (
            <>
              <span className="text-neutral-400 dark:text-neutral-600">·</span>
              <span className="flex items-center gap-1 text-[11px] text-[#00CCFF]">
                <span className="relative inline-flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00CCFF] opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00CCFF]" />
                </span>
                streaming
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {canDiff && (
            <button
              type="button"
              onClick={() => setShowDiff((v) => !v)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-neutral-600 transition hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
              title={showDiff ? 'Hide diff' : 'Show diff vs previous'}
            >
              {showDiff ? <Eye className="h-3.5 w-3.5" /> : <Edit3 className="h-3.5 w-3.5" />}
              {showDiff ? 'View' : 'Diff'}
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy code"
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-neutral-600 transition hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      <div style={{ height: Math.min(Math.max(lineCount * 19 + 24, 200), 520) }}>
        {showDiff && canDiff ? (
          <DiffEditor
            language={language}
            theme={monacoTheme}
            original={previousCode ?? ''}
            modified={artifact.code}
            options={{
              readOnly: true,
              renderSideBySide: false,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 13,
              fontFamily:
                'var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              automaticLayout: true,
              lineNumbersMinChars: 3,
            }}
          />
        ) : (
          <MonacoEditor
            language={language}
            theme={monacoTheme}
            value={artifact.code}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 13,
              fontFamily:
                'var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              wordWrap: 'on',
              automaticLayout: true,
              lineNumbersMinChars: 3,
              renderLineHighlight: 'none',
            }}
          />
        )}
      </div>
    </div>
  );
}
