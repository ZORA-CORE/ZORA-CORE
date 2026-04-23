/**
 * POST /api/valkyrie/ship
 *
 * Valkyrie 2.0 — the "manifestation" endpoint. Given the current
 * Forge artifacts + transcript, creates a brand-new GitHub repo
 * under `GITHUB_VALHALLA_OWNER` (default: ZORA-CORE) and lands a
 * single atomic commit containing every file in the Valkyrie
 * bundle (code, CI, worker skeleton, supabase migration, deploy
 * script, README).
 *
 * Auth:
 *   - Requires `GITHUB_VALHALLA_PAT` in the server env. If missing
 *     the route short-circuits with 503 and a helpful error so the
 *     UI can prompt the operator to set it without a 500-page dump.
 *
 * Input (JSON body):
 *   { repo: string,
 *     artifacts: SessionArtifact[],
 *     messages: SessionMessage[],
 *     description?: string,
 *     private?: boolean }
 *
 * Output (JSON):
 *   { repoUrl, repoFullName, commitUrl, commitSha, branch, fileCount }
 *
 * Threading: Next.js `req.signal` is forwarded to `fetch()` so that
 * cancelling the browser request aborts any in-flight GitHub call.
 */

import { NextResponse } from 'next/server';
import {
  buildValkyrieFileEntries,
  type SessionArtifact,
  type SessionMessage,
} from '@/lib/valhalla/valkyrie/files';
import {
  shipValkyrieToGitHub,
  ShipError,
} from '@/lib/valhalla/valkyrie/github';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ShipRequestBody {
  repo?: string;
  artifacts?: SessionArtifact[];
  messages?: SessionMessage[];
  description?: string;
  private?: boolean;
}

function isArtifact(x: unknown): x is SessionArtifact {
  if (!x || typeof x !== 'object') return false;
  const a = x as Record<string, unknown>;
  return (
    typeof a.id === 'string' &&
    (a.kind === 'code' || a.kind === 'mermaid') &&
    typeof a.language === 'string' &&
    typeof a.code === 'string' &&
    typeof a.messageId === 'string' &&
    typeof a.index === 'number'
  );
}

function isMessage(x: unknown): x is SessionMessage {
  if (!x || typeof x !== 'object') return false;
  const m = x as Record<string, unknown>;
  return (
    typeof m.id === 'string' &&
    (m.role === 'user' || m.role === 'assistant') &&
    typeof m.content === 'string' &&
    (typeof m.createdAt === 'string' || typeof m.createdAt === 'number')
  );
}

export async function POST(req: Request): Promise<Response> {
  const pat = process.env.GITHUB_VALHALLA_PAT;
  if (!pat) {
    return NextResponse.json(
      {
        error: 'valkyrie_unconfigured',
        message:
          'GITHUB_VALHALLA_PAT is not set on the server. Add a fine-grained PAT (Administration: write, Contents: write, Workflows: write) to enable Valkyrie 2.0 ship.',
      },
      { status: 503 },
    );
  }

  let body: ShipRequestBody;
  try {
    body = (await req.json()) as ShipRequestBody;
  } catch {
    return NextResponse.json(
      { error: 'invalid_json', message: 'Body must be valid JSON.' },
      { status: 400 },
    );
  }

  const repo = (body.repo ?? '').trim();
  if (!repo) {
    return NextResponse.json(
      { error: 'missing_repo', message: 'Field `repo` is required.' },
      { status: 400 },
    );
  }

  const artifacts = Array.isArray(body.artifacts)
    ? body.artifacts.filter(isArtifact)
    : [];
  const messages = Array.isArray(body.messages)
    ? body.messages.filter(isMessage)
    : [];

  const codeCount = artifacts.filter((a) => a.kind === 'code').length;
  if (codeCount === 0) {
    return NextResponse.json(
      {
        error: 'no_code',
        message:
          'Refusing to ship: the session has no code artifacts yet. Ask Thor to forge something first.',
      },
      { status: 400 },
    );
  }

  const files = buildValkyrieFileEntries(artifacts, messages);
  const owner = process.env.GITHUB_VALHALLA_OWNER || 'ZORA-CORE';
  const ownerIsOrg =
    (process.env.GITHUB_VALHALLA_OWNER_TYPE || 'org').toLowerCase() === 'org';

  try {
    const result = await shipValkyrieToGitHub({
      pat,
      owner,
      ownerIsOrg,
      repo,
      description: body.description,
      private: body.private,
      files,
      signal: req.signal,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ShipError) {
      return NextResponse.json(
        {
          error: 'github_error',
          message: err.message,
          status: err.status ?? null,
          detail: err.githubBody ?? null,
        },
        { status: err.status && err.status < 500 ? 400 : 502 },
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'internal_error', message: msg },
      { status: 500 },
    );
  }
}
