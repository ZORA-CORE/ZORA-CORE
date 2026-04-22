'use client';

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  value: string;
}

export function CodeBlock({ language, value }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore clipboard failures */
    }
  };

  return (
    <div className="group relative my-3 overflow-hidden rounded-xl border border-[#2a2a2e] bg-[#0f0f12] text-sm">
      <div className="flex items-center justify-between border-b border-[#1f1f24] bg-[#141418] px-4 py-2 text-xs">
        <span className="font-mono uppercase tracking-wider text-[#9b9ba3]">
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy code"
          className="flex items-center gap-1.5 rounded-md px-2 py-1 font-medium text-[#d4d4da] transition hover:bg-[#1f1f24] hover:text-[#00CCFF]"
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
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '1rem 1.25rem',
          background: 'transparent',
          fontSize: '0.875rem',
          lineHeight: 1.6,
        }}
        codeTagProps={{
          style: { fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' },
        }}
      >
        {value.replace(/\n$/, '')}
      </SyntaxHighlighter>
    </div>
  );
}
