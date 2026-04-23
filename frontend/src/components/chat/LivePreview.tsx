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
    const starterRe = /^\s*(import|export)(\s|\(|\{)/;
    const isComplete = (buf: string): boolean => {
      // Balance braces and parens across the buffer; we only treat the
      // statement as complete once every opening has closed.
      let depth = 0;
      for (const ch of buf) {
        if (ch === '{' || ch === '(') depth += 1;
        else if (ch === '}' || ch === ')') depth -= 1;
      }
      if (depth !== 0) return false;
      // `import 'foo'` / `import x from 'foo';` / `export default …;`
      return /;\s*$/.test(buf.trimEnd()) || /from\s+['"][^'"]+['"]\s*;?\s*$/.test(buf.trimEnd());
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
