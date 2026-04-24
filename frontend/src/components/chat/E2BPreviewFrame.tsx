'use client';

/**
 * E2BPreviewFrame \u2014 live iframe on an E2B-exposed port.
 *
 * When THOR or FREJA calls `expose_port` in the sandbox, the
 * orchestrator emits a `preview_url` SSE event with a public HTTPS URL
 * pointing at `localhost:<port>` inside the microVM. This component
 * renders that URL in an iframe, with a "Waiting for localhost:3000\u2026"
 * loading state while the URL is absent and a progressive load-state
 * overlay while the iframe boots.
 */
import { useState } from 'react';
import { ExternalLink, Globe, Loader2 } from 'lucide-react';

interface E2BPreviewFrameProps {
  url: string | null;
  port?: number;
}

export function E2BPreviewFrame({ url, port = 3000 }: E2BPreviewFrameProps) {
  if (!url) {
    return <WaitingState port={port} />;
  }
  // Remount the iframe whenever the URL changes so the load-state
  // overlay resets cleanly without a setState-in-effect.
  return <E2BPreviewFrameInner key={url} url={url} port={port} />;
}

function WaitingState({ port }: { port: number }) {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-white/60 p-6 text-center dark:border-neutral-700 dark:bg-neutral-900/40">
      <Loader2 className="h-6 w-6 animate-spin text-[#00CCFF]" aria-hidden />
      <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
        Waiting for localhost:{port}…
      </div>
      <div className="max-w-md text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
        THOR or FREJA will spin up a dev server in the E2B sandbox and call{' '}
        <code className="font-mono text-[11px]">expose_port</code>. The public
        preview URL will appear here as soon as the port is reachable.
      </div>
    </div>
  );
}

function E2BPreviewFrameInner({ url, port }: { url: string; port: number }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative flex h-full min-h-[320px] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#0a0a0a]">
      <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[11px] text-neutral-500 dark:border-neutral-800 dark:bg-[#111] dark:text-neutral-400">
        <div className="flex min-w-0 items-center gap-1.5 font-mono">
          <Globe className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">{url}</span>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-neutral-500 transition hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
        >
          Open
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <div className="relative min-h-0 flex-1">
        <iframe
          src={url}
          className="absolute inset-0 h-full w-full border-0 bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          onLoad={() => setLoaded(true)}
          title="E2B live preview"
        />
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80 text-center dark:bg-[#0a0a0a]/80">
            <Loader2
              className="h-5 w-5 animate-spin text-[#00CCFF]"
              aria-hidden
            />
            <div className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
              Waiting for localhost:{port}…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
