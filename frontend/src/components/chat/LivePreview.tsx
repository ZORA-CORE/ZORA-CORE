'use client';

/**
 * Live Preview — runs the forged code inside an isolated browser sandbox
 * (CodeSandbox Sandpack, which provides a WebContainers-like in-browser
 * runtime without requiring cross-origin isolation headers).
 *
 * Heuristics pick the first runnable artifact:
 *   - React component (jsx/tsx with default export or component-shaped code) → react-ts template
 *   - Plain HTML snippet → static template
 *   - JS/TS function or script → vanilla-ts template (wraps in console.log)
 * Unsupported languages show a friendly "not previewable" state.
 */

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { Artifact } from './artifacts';

const SandpackProvider = dynamic(
  () => import('@codesandbox/sandpack-react').then((m) => m.SandpackProvider),
  { ssr: false },
);
const SandpackLayout = dynamic(
  () => import('@codesandbox/sandpack-react').then((m) => m.SandpackLayout),
  { ssr: false },
);
const SandpackPreview = dynamic(
  () => import('@codesandbox/sandpack-react').then((m) => m.SandpackPreview),
  { ssr: false },
);
const SandpackCodeEditor = dynamic(
  () => import('@codesandbox/sandpack-react').then((m) => m.SandpackCodeEditor),
  { ssr: false },
);

interface LivePreviewProps {
  artifacts: Artifact[];
}

type Template = 'react-ts' | 'static' | 'vanilla-ts';

interface PreviewPlan {
  template: Template;
  files: Record<string, string>;
  entry: string;
  previewable: true;
}

interface NotPreviewable {
  previewable: false;
  reason: string;
}

function pickPreviewable(artifacts: Artifact[]): PreviewPlan | NotPreviewable {
  const code = artifacts.filter((a) => a.kind === 'code' && a.code.trim());
  if (code.length === 0) {
    return {
      previewable: false,
      reason: 'No code artifacts yet. Ask Valhalla to forge a component or HTML snippet.',
    };
  }

  // Prefer a React/TSX artifact with what looks like a component export.
  const react = code.find((a) => {
    const lang = a.language.toLowerCase();
    if (!['tsx', 'jsx', 'typescript', 'ts', 'javascript', 'js'].includes(lang))
      return false;
    return (
      /export\s+default\s+function/.test(a.code) ||
      /export\s+default\s+\(/.test(a.code) ||
      /const\s+\w+\s*[:=]\s*\(.*?\)\s*=>/.test(a.code) ||
      /function\s+[A-Z]\w*\s*\(/.test(a.code)
    );
  });

  if (react) {
    const ext = ['tsx', 'typescript', 'ts'].includes(react.language.toLowerCase())
      ? 'tsx'
      : 'jsx';
    const entry = `/App.${ext}`;
    return {
      template: 'react-ts',
      files: {
        [entry]: react.code,
      },
      entry,
      previewable: true,
    };
  }

  // HTML snippet.
  const html = code.find((a) => {
    const lang = a.language.toLowerCase();
    return (
      lang === 'html' ||
      lang === 'htm' ||
      /^\s*<!doctype html/i.test(a.code) ||
      /^\s*<html/i.test(a.code)
    );
  });
  if (html) {
    return {
      template: 'static',
      files: { '/index.html': html.code },
      entry: '/index.html',
      previewable: true,
    };
  }

  // Vanilla JS/TS script — wrap in a minimal page that runs it and shows console output.
  const script = code.find((a) => {
    const lang = a.language.toLowerCase();
    return ['ts', 'typescript', 'js', 'javascript'].includes(lang);
  });
  if (script) {
    const appHtml = `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8" /><title>Valhalla Live</title>
  <style>body{font-family:ui-monospace,monospace;padding:16px;background:#0f0f12;color:#eaeaec;}pre{white-space:pre-wrap}</style>
  </head>
  <body>
    <h3 style="color:#00CCFF;margin:0 0 8px 0;font:600 12px/1 system-ui,-apple-system">SCRIPT OUTPUT</h3>
    <pre id="out"></pre>
    <script type="module" src="./index.ts"></script>
  </body>
</html>`;
    // Split top-level `import` / `export` statements from the rest of the
    // body. ES modules disallow those keywords inside block statements, so
    // they must stay at the module top level (above the console wrapper).
    //
    // Imports can span multiple lines, e.g.
    //   import {
    //     foo,
    //     bar,
    //   } from 'baz';
    // so we walk line-by-line tracking brace depth and consume continuation
    // lines until the statement is balanced AND terminated (semicolon or
    // the `from '…'` / `'…';` tail).
    const lines = script.code.split('\n');
    const topLevel: string[] = [];
    const body: string[] = [];
    // Match static `import …` / `export …` declarations only. We
    // deliberately exclude `import(` because that's a dynamic import
    // *expression* (valid inside block bodies), not a top-level
    // declaration — hoisting it out of the try/catch wrapper would
    // change its error-handling semantics.
    const starterRe = /^\s*(import|export)(\s|\{)/;
    const isComplete = (buf: string): boolean => {
      // Walk the buffer and balance braces / parens. The counter is
      // intentionally lexer-naive (no string / regex / comment state),
      // so a stray `{` or `}` inside a literal will miscount depth —
      // we rely on the terminator heuristics below to recover.
      let depth = 0;
      for (const ch of buf) {
        if (ch === '{' || ch === '(') depth += 1;
        else if (ch === '}' || ch === ')') depth -= 1;
      }
      const trimmed = buf.trimEnd();
      const singleLine = !buf.includes('\n');
      const endsWithSemicolon = /;\s*$/.test(trimmed);
      const endsWithFromClause = /from\s+['"][^'"]+['"]\s*;?\s*$/.test(trimmed);
      const isExportFnOrClass =
        /^\s*export\b/.test(buf) &&
        /\}\s*$/.test(trimmed) &&
        /\b(function|class|async\s+function)\b/.test(buf);

      if (depth === 0) {
        // Braces balanced. Trust any standard terminator, including
        // multi-line `export function` / `export class` / default
        // function tails that end with `}` (not `;`).
        if (endsWithSemicolon || endsWithFromClause || isExportFnOrClass) {
          return true;
        }
        // Depth-zero single-line statements without a semicolon (e.g.
        // `export const API_URL = '…'`, `export { foo }` with no
        // trailing `;`) are complete — there is no continuation to
        // accumulate.
        if (singleLine) return true;
        // Multi-line at depth 0 without a known tail is unusual; stay
        // conservative and let the outer loop append the next line.
        return false;
      }

      // depth !== 0. Two shapes land here:
      //   (a) Genuinely multi-line declarations mid-accumulation such
      //       as `import {` on its own line — we MUST return false so
      //       the outer loop pulls in the continuation lines, otherwise
      //       `import {` gets hoisted to topLevel while `useState,` /
      //       `} from 'react';` fall into body and get wrapped in the
      //       try/catch, producing a syntax error.
      //   (b) A single-line statement whose stray `{` / `}` lives
      //       inside a string or regex literal — e.g.
      //       `export const re = /\{/;` or `export const msg = "{";`.
      //       These are complete by construction, so we trust the
      //       terminator heuristics to recover from the miscount.
      if (singleLine && (endsWithSemicolon || endsWithFromClause)) {
        return true;
      }
      return false;
    };
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (starterRe.test(line)) {
        let buf = line;
        let j = i + 1;
        while (!isComplete(buf) && j < lines.length) {
          buf += '\n' + lines[j];
          j += 1;
        }
        topLevel.push(buf);
        i = j;
      } else {
        body.push(line);
        i += 1;
      }
    }
    const wrap = `${topLevel.join('\n')}
// Captured console output
const __out = document.getElementById('out');
const __log = (...args) => {
  const line = args.map(a => typeof a === 'string' ? a : JSON.stringify(a, null, 2)).join(' ');
  if (__out) __out.textContent += line + '\\n';
};
const originalLog = console.log;
console.log = (...a) => { __log(...a); originalLog(...a); };
try {
${body.join('\n')}
} catch (err) {
  __log('ERROR:', err instanceof Error ? err.message : String(err));
}
`;
    return {
      template: 'vanilla-ts',
      files: {
        '/index.html': appHtml,
        '/index.ts': wrap,
      },
      entry: '/index.html',
      previewable: true,
    };
  }

  return {
    previewable: false,
    reason: `No previewable artifact found. Languages detected: ${Array.from(
      new Set(code.map((a) => a.language)),
    ).join(', ')}.`,
  };
}

export function LivePreview({ artifacts }: LivePreviewProps) {
  const plan = useMemo(() => pickPreviewable(artifacts), [artifacts]);

  if (!plan.previewable) {
    return (
      <div className="flex flex-col items-start gap-1 rounded-xl border border-dashed border-[#EAEAEC] bg-white/60 p-5">
        <div className="text-sm font-medium text-[#1D1D1F]">
          Preview not available
        </div>
        <div className="text-xs leading-5 text-[#6E6E73]">{plan.reason}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[10px] font-medium uppercase tracking-wider text-[#9b9ba3]">
        Running in isolated sandbox · {plan.template}
      </div>
      <SandpackProvider
        template={plan.template}
        files={plan.files}
        options={{ activeFile: plan.entry }}
        theme="light"
      >
        <SandpackLayout>
          <SandpackCodeEditor
            style={{ height: 280 }}
            showTabs
            showLineNumbers
            showInlineErrors
          />
          <SandpackPreview
            style={{ height: 280 }}
            showNavigator={false}
            showOpenInCodeSandbox={false}
            showRefreshButton
          />
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
}
