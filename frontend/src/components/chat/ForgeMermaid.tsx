'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

let mermaidInitialized = false;
function initMermaidOnce(): void {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'neutral',
    securityLevel: 'strict',
    fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui',
  });
  mermaidInitialized = true;
}

interface ForgeMermaidProps {
  id: string;
  code: string;
  /** When streaming, we skip render until the closing fence arrives. */
  isStreaming: boolean;
}

/**
 * Renders a Mermaid diagram from the given source.
 * While the block is still streaming, we show the raw source (so users see
 * progress) and only trigger mermaid.render() once the fence closes.
 */
export function ForgeMermaid({ id, code, isStreaming }: ForgeMermaidProps) {
  const [svg, setSvg] = useState<string>('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const renderTokenRef = useRef(0);

  useEffect(() => {
    if (isStreaming) {
      // Invalidate any in-flight render so the previous frame isn't committed
      // after a later reset. State is left as-is and will naturally be empty
      // when the stream first enters this branch.
      renderTokenRef.current += 1;
      return;
    }
    initMermaidOnce();
    const token = ++renderTokenRef.current;
    const safeId = `mermaid-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    mermaid
      .render(safeId, code)
      .then((result) => {
        if (renderTokenRef.current !== token) return;
        setSvg(result.svg);
        setRenderError(null);
      })
      .catch((err: unknown) => {
        if (renderTokenRef.current !== token) return;
        const message = err instanceof Error ? err.message : String(err);
        setRenderError(message);
        setSvg('');
      });
  }, [id, code, isStreaming]);

  if (isStreaming) {
    return (
      <div className="rounded-xl border border-[#EAEAEC] bg-white p-4 font-mono text-xs text-[#6E6E73]">
        <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-[#9b9ba3]">
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00CCFF] opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00CCFF]" />
          </span>
          Rendering diagram…
        </div>
        <pre className="whitespace-pre-wrap">{code}</pre>
      </div>
    );
  }

  if (renderError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
        <div className="mb-1 font-semibold">Mermaid render error</div>
        <div className="mb-3 font-mono">{renderError}</div>
        <pre className="whitespace-pre-wrap rounded-lg bg-white p-2 font-mono text-[#6E6E73]">
          {code}
        </pre>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-[#EAEAEC] bg-white p-4 [&_svg]:mx-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
