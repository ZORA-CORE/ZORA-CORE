'use client';

/**
 * Valhalla AI — "Ship" modal.
 *
 * One-click manifestation: POSTs the current session artifacts +
 * transcript to /api/valkyrie/ship, which (1) creates a new GitHub
 * repo under the configured owner and (2) lands every Valkyrie bundle
 * file in a single atomic commit. On success we show the repo URL so
 * the operator can jump straight to the forge.
 */

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Ship, X } from 'lucide-react';
import type { Artifact } from './artifacts';
import type { ChatMessage } from './types';

interface ShipModalProps {
  open: boolean;
  artifacts: Artifact[];
  messages: ChatMessage[];
  onClose: () => void;
}

interface ShipResult {
  repoFullName: string;
  repoUrl: string;
  branch: string;
  commitSha: string;
  commitUrl: string;
  fileCount: number;
}

interface ShipError {
  error: string;
  message: string;
  status?: number | null;
  detail?: string | null;
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'valhalla-forge'
  );
}

function defaultRepoName(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  const seed = firstUser?.content?.slice(0, 60) || '';
  const stamp = new Date().toISOString().slice(0, 10);
  return `${slugify(seed || 'valhalla-forge')}-${stamp}`;
}

export function ShipModal({
  open,
  artifacts,
  messages,
  onClose,
}: ShipModalProps) {
  const [repo, setRepo] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  const [result, setResult] = useState<ShipResult | null>(null);
  const [error, setError] = useState<ShipError | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      setRepo(defaultRepoName(messages));
      setDescription('Forged by Valhalla AI — Valkyrie 2.0');
      setResult(null);
      setError(null);
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, [open, messages]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose();
    }
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  async function handleShip() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch('/api/valkyrie/ship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: repo.trim(),
          description: description.trim(),
          private: isPrivate,
          artifacts: artifacts.map((a) => ({
            id: a.id,
            kind: a.kind,
            language: a.language,
            code: a.code,
            messageId: a.messageId,
            index: a.index,
          })),
          messages: messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
          })),
        }),
        signal: controller.signal,
      });
      const json = (await res.json().catch(() => ({}))) as
        | ShipResult
        | ShipError;
      if (!res.ok) {
        setError({
          error: 'error' in json ? json.error : 'unknown',
          message:
            'message' in json && json.message
              ? json.message
              : `HTTP ${res.status}`,
          status: res.status,
          detail: 'detail' in json ? json.detail ?? null : null,
        });
      } else {
        setResult(json as ShipResult);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError({
          error: 'network_error',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  if (!open) return null;

  const codeCount = artifacts.filter((a) => a.kind === 'code').length;

  return (
    <AnimatePresence>
      <motion.div
        key="ship-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-24"
        onClick={() => !busy && onClose()}
      >
        <motion.div
          key="ship-card"
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -8, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="w-full max-w-[520px] overflow-hidden rounded-2xl border border-[#E5E5EA] bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-[#F0F0F2] px-5 py-3">
            <div className="flex items-center gap-2">
              <Ship className="h-4 w-4 text-[#008FBF]" />
              <h2 className="text-sm font-semibold text-[#1D1D1F]">
                Ship to GitHub — Valkyrie 2.0
              </h2>
            </div>
            <button
              type="button"
              onClick={() => !busy && onClose()}
              className="rounded-md p-1 text-[#9b9ba3] transition hover:bg-[#F5F5F7] hover:text-[#1D1D1F]"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col gap-4 px-5 py-4">
            {!result && (
              <>
                <p className="text-xs leading-5 text-[#6E6E73]">
                  Creates a new repo and commits every forged artifact plus
                  the Valkyrie bundle (CI workflow, Cloudflare Worker
                  skeleton, Supabase migration, deploy script) in one
                  atomic commit. {codeCount} code artifact
                  {codeCount === 1 ? '' : 's'} ready to land.
                </p>

                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-[#9b9ba3]">
                    Repo name
                  </span>
                  <input
                    ref={inputRef}
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    disabled={busy}
                    className="rounded-lg border border-[#E5E5EA] bg-[#FAFAFA] px-3 py-2 text-sm text-[#1D1D1F] outline-none transition focus:border-[#008FBF] focus:bg-white disabled:opacity-50"
                    placeholder="my-forged-project"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-[#9b9ba3]">
                    Description
                  </span>
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={busy}
                    className="rounded-lg border border-[#E5E5EA] bg-[#FAFAFA] px-3 py-2 text-sm text-[#1D1D1F] outline-none transition focus:border-[#008FBF] focus:bg-white disabled:opacity-50"
                    placeholder="Forged by Valhalla AI…"
                  />
                </label>

                <label className="flex items-center gap-2 text-xs text-[#6E6E73]">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    disabled={busy}
                    className="h-3.5 w-3.5"
                  />
                  Make repo private
                </label>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    <div className="font-medium">{error.message}</div>
                    {error.detail && (
                      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-[10px] text-red-800/80">
                        {error.detail}
                      </pre>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => !busy && onClose()}
                    disabled={busy}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#6E6E73] transition hover:bg-[#F5F5F7] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleShip}
                    disabled={busy || !repo.trim() || codeCount === 0}
                    className="flex items-center gap-1.5 rounded-lg bg-[#008FBF] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#0077A3] disabled:opacity-50"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Forging…
                      </>
                    ) : (
                      <>
                        <Ship className="h-3.5 w-3.5" />
                        Manifest repo
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {result && (
              <>
                <div className="rounded-lg border border-[#B3F1E4] bg-[#E6FAFF]/40 px-3 py-3 text-xs text-[#1D1D1F]">
                  <div className="text-sm font-semibold">
                    Manifested. {result.fileCount} file
                    {result.fileCount === 1 ? '' : 's'} landed in a single
                    commit on <code>{result.branch}</code>.
                  </div>
                  <div className="mt-2 flex flex-col gap-1">
                    <a
                      className="text-[#008FBF] underline"
                      href={result.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {result.repoFullName}
                    </a>
                    <a
                      className="text-[#6E6E73] underline"
                      href={result.commitUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Commit {result.commitSha.slice(0, 7)}
                    </a>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg bg-[#008FBF] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#0077A3]"
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
