'use client';

/**
 * Valhalla AI — Prometheus PR 3a: structured event cards.
 *
 * The orchestrator (PR 3 Infinity Loop) emits two new SSE event types
 * that carry structured payloads richer than a single log line:
 *
 *   - `raven_research`        HUGIN/MUNIN findings + citations from
 *                             a Perplexity-backed online lookup.
 *   - `provider_key_missing`  Onboarding payload (envKey, dashboard
 *                             URL, instruction, secrets API endpoint)
 *                             for one-click key provisioning.
 *
 * `swarmStream.ts:applyEvent` flags these via `ThoughtEvent.payload`.
 * `ChatContainer` filters the rAF-batched thought stream for ones
 * with a structured payload and renders these cards inline above the
 * active assistant bubble. Plain-text log lines continue to surface
 * in the Forge terminal as before.
 */

import { useState } from 'react';
import { ExternalLink, KeyRound, Search } from 'lucide-react';
import type { ThoughtPayload } from './artifacts';

interface RavenResearchCardProps {
  raven: 'hugin' | 'munin';
  query: string;
  findings: string;
  citations: string[];
}

const RAVEN_LABEL: Record<'hugin' | 'munin', string> = {
  hugin: 'HUGIN',
  munin: 'MUNIN',
};

const RAVEN_BEAT: Record<'hugin' | 'munin', string> = {
  hugin: 'present-day research',
  munin: 'historical context',
};

export function RavenResearchCard({
  raven,
  query,
  findings,
  citations,
}: RavenResearchCardProps) {
  const label = RAVEN_LABEL[raven];
  const beat = RAVEN_BEAT[raven];
  return (
    <div
      data-testid={`raven-card-${raven}`}
      className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-neutral-800 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-neutral-100"
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
        <Search className="h-3.5 w-3.5" />
        <span className="font-semibold">{label}</span>
        <span className="text-neutral-500 dark:text-neutral-400">
          · {beat}
        </span>
      </div>
      <div
        data-testid={`raven-card-${raven}-query`}
        className="mt-1 text-[11px] italic text-neutral-500 dark:text-neutral-400"
      >
        “{query}”
      </div>
      <div
        data-testid={`raven-card-${raven}-findings`}
        className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-800 dark:text-neutral-100"
      >
        {findings}
      </div>
      {citations.length > 0 && (
        <div className="mt-3 border-t border-emerald-200/60 pt-2 dark:border-emerald-900/40">
          <div className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            Citations
          </div>
          <ul
            data-testid={`raven-card-${raven}-citations`}
            className="mt-1 flex flex-col gap-1"
          >
            {citations.map((c, i) => {
              const isUrl = /^https?:\/\//i.test(c);
              return (
                <li
                  key={`${c}-${i}`}
                  className="text-[12px] text-neutral-700 dark:text-neutral-300"
                >
                  {isUrl ? (
                    <a
                      href={c}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 text-emerald-700 hover:underline dark:text-emerald-300"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span className="break-all">{c}</span>
                    </a>
                  ) : (
                    <span className="break-words">{c}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

interface ProviderKeyMissingCardProps {
  agent: string;
  provider: string;
  envKey: string;
  displayName: string;
  dashboardUrl: string;
  instruction: string;
  secretApiEndpoint: string;
  /** User id used by `/api/secrets/<provider>` POST. */
  userId: string;
}

type SubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'ok' }
  | { status: 'error'; message: string };

export function ProviderKeyMissingCard({
  agent,
  provider,
  envKey,
  displayName,
  dashboardUrl,
  instruction,
  secretApiEndpoint,
  userId,
}: ProviderKeyMissingCardProps) {
  const [apiKey, setApiKey] = useState('');
  const [submit, setSubmit] = useState<SubmitState>({ status: 'idle' });

  async function onSave(): Promise<void> {
    if (!apiKey.trim()) {
      setSubmit({ status: 'error', message: 'Paste a key first.' });
      return;
    }
    setSubmit({ status: 'submitting' });
    try {
      const res = await fetch(secretApiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, apiKey: apiKey.trim() }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        setSubmit({
          status: 'error',
          message: text || `HTTP ${res.status}`,
        });
        return;
      }
      setSubmit({ status: 'ok' });
      setApiKey('');
    } catch (err) {
      setSubmit({
        status: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return (
    <div
      data-testid={`provider-key-missing-card-${provider}`}
      className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-neutral-800 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-neutral-100"
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-amber-700 dark:text-amber-300">
        <KeyRound className="h-3.5 w-3.5" />
        <span className="font-semibold">{displayName} key missing</span>
        <span className="text-neutral-500 dark:text-neutral-400">
          · for {agent.toUpperCase()}
        </span>
      </div>
      <p
        data-testid={`provider-key-missing-card-${provider}-instruction`}
        className="mt-2 text-[13px] leading-relaxed text-neutral-700 dark:text-neutral-200"
      >
        {instruction}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
        <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
          {envKey}
        </span>
        <a
          data-testid={`provider-key-missing-card-${provider}-dashboard`}
          href={dashboardUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-amber-700 hover:underline dark:text-amber-300"
        >
          <ExternalLink className="h-3 w-3" />
          <span>Open {displayName} dashboard</span>
        </a>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={`Paste ${envKey}`}
          aria-label={`${envKey} value`}
          data-testid={`provider-key-missing-card-${provider}-input`}
          className="flex-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 font-mono text-[12px] text-neutral-900 placeholder:text-neutral-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500"
        />
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={submit.status === 'submitting'}
          data-testid={`provider-key-missing-card-${provider}-save`}
          className="rounded-md bg-amber-600 px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-amber-700 disabled:opacity-50 dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-neutral-900"
        >
          {submit.status === 'submitting' ? 'Saving…' : 'Save key'}
        </button>
      </div>
      {submit.status === 'ok' && (
        <div
          data-testid={`provider-key-missing-card-${provider}-saved`}
          className="mt-2 text-[12px] text-emerald-700 dark:text-emerald-300"
        >
          Key saved. Rerun the request to re-resolve {displayName}.
        </div>
      )}
      {submit.status === 'error' && (
        <div
          data-testid={`provider-key-missing-card-${provider}-error`}
          className="mt-2 text-[12px] text-red-700 dark:text-red-300"
        >
          {submit.message}
        </div>
      )}
    </div>
  );
}

interface StructuredCardProps {
  payload: ThoughtPayload;
  userId: string;
}

/**
 * Single dispatch-by-kind helper so callers don't import every card
 * variant individually.
 */
export function StructuredCard({ payload, userId }: StructuredCardProps) {
  if (payload.kind === 'raven_research') {
    return (
      <RavenResearchCard
        raven={payload.raven}
        query={payload.query}
        findings={payload.findings}
        citations={payload.citations}
      />
    );
  }
  if (payload.kind === 'provider_key_missing') {
    return (
      <ProviderKeyMissingCard
        agent={payload.agent}
        provider={payload.provider}
        envKey={payload.envKey}
        displayName={payload.displayName}
        dashboardUrl={payload.dashboardUrl}
        instruction={payload.instruction}
        secretApiEndpoint={payload.secretApiEndpoint}
        userId={userId}
      />
    );
  }
  return null;
}
