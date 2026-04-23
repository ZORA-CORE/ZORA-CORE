/**
 * Valhalla AI — Vercel deploy-failure self-recovery webhook.
 *
 * Vercel sends a POST to this route on deployment lifecycle events
 * (deployment.created / .ready / .error / .canceled). We act only on
 * failure events: fetch the build log via the Vercel API, hand it to
 * Dify with a "repair this" system prompt, and record the attempt in
 * the in-memory recovery ring so the chat UI can surface a banner.
 *
 * Setup (documented in VALKYRIE.md):
 *   1. Create an integration at https://vercel.com/dashboard/integrations
 *      and point its webhook URL at  https://<your-domain>/api/vercel/webhook
 *   2. Copy the integration's signing secret to VERCEL_WEBHOOK_SECRET.
 *   3. Ensure VERCEL_TOKEN is already set (it is — used for log fetch).
 *   4. Ensure DIFY_API_KEY is already set (it is — used for the repair turn).
 *
 * Why in-memory (not Supabase): Slice B hasn't landed yet and we didn't
 * want to block Phase 3 on infra. The ring is a UX-quality substitute.
 */

import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import {
  MAX_ATTEMPTS,
  hasExhaustedAttempts,
  recordRecoveryAttempt,
  updateRecovery,
  type RecoveryEvent,
} from '@/lib/vercel-recovery-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DIFY_BASE = process.env.DIFY_API_BASE || 'https://api.dify.ai/v1';

interface VercelWebhookPayload {
  id?: string;
  type?: string; // e.g. "deployment.error"
  createdAt?: number;
  payload?: {
    deployment?: {
      id?: string;
      url?: string;
      name?: string;
      meta?: Record<string, string>;
    };
    project?: { id?: string; name?: string };
    team?: { id?: string };
    errorCode?: string;
    errorMessage?: string;
  };
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/** Vercel signs webhook bodies with HMAC-SHA1 of the raw body. */
function verifySignature(raw: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac('sha1', secret).update(raw).digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex'),
    );
  } catch {
    return false;
  }
}

/** Pull the tail of the build log for the failed deployment. */
async function fetchBuildLogTail(deploymentId: string): Promise<string> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) return '(VERCEL_TOKEN not set — build log unavailable)';
  try {
    const res = await fetch(
      `https://api.vercel.com/v3/deployments/${encodeURIComponent(deploymentId)}/events?builds=1&direction=backward&limit=80`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return `(Vercel API returned ${res.status})`;
    const events = (await res.json()) as Array<{ text?: string; payload?: { text?: string } }>;
    const text = events
      .map((e) => e.text ?? e.payload?.text ?? '')
      .filter(Boolean)
      .join('\n');
    return text.slice(-6000) || '(empty build log)';
  } catch (err) {
    return `(log fetch failed: ${err instanceof Error ? err.message : String(err)})`;
  }
}

/** Fire-and-forget a repair prompt to Dify. Returns the conversation id. */
async function dispatchRepairTurn(
  projectName: string,
  errorSummary: string,
  logTail: string,
): Promise<string | null> {
  const key = process.env.DIFY_API_KEY;
  if (!key) return null;

  const query = [
    `⚒️  A Vercel production deploy for "${projectName}" just failed.`,
    '',
    '## Error',
    errorSummary,
    '',
    '## Build log (tail)',
    '```',
    logTail,
    '```',
    '',
    'HEIMDALL: identify the root cause in 2-3 sentences.',
    'ODIN: propose the minimal architectural fix.',
    'THOR: write the exact code diff needed to apply the fix.',
    'Output the diff in a fenced patch block so it can be copy-pasted.',
  ].join('\n');

  try {
    const res = await fetch(`${DIFY_BASE}/chat-messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {},
        query,
        response_mode: 'blocking',
        user: 'valhalla-self-recovery',
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { conversation_id?: string };
    return data.conversation_id ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  const secret = process.env.VERCEL_WEBHOOK_SECRET;
  if (!secret) return jsonError('VERCEL_WEBHOOK_SECRET is not configured.', 503);

  const raw = await req.text();
  const signature = req.headers.get('x-vercel-signature');
  if (!verifySignature(raw, signature, secret)) {
    return jsonError('Invalid signature.', 401);
  }

  let payload: VercelWebhookPayload;
  try {
    payload = JSON.parse(raw) as VercelWebhookPayload;
  } catch {
    return jsonError('Body was not valid JSON.', 400);
  }

  const type = payload.type ?? '';
  // Only react to failures. Everything else (ready, created, canceled)
  // acks with 200 so Vercel doesn't retry.
  const isFailure = type === 'deployment.error' || type === 'deployment.build.failed';
  if (!isFailure) {
    return new Response(JSON.stringify({ ok: true, ignored: type }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const dep = payload.payload?.deployment;
  const deploymentId = dep?.id ?? 'unknown';
  const projectName = payload.payload?.project?.name ?? dep?.name ?? null;

  if (hasExhaustedAttempts(deploymentId)) {
    return new Response(
      JSON.stringify({
        ok: true,
        skipped: 'max-attempts-reached',
        deploymentId,
        maxAttempts: MAX_ATTEMPTS,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    );
  }

  const errorSummary =
    payload.payload?.errorMessage ??
    (payload.payload?.errorCode
      ? `errorCode: ${payload.payload.errorCode}`
      : 'Unknown deploy failure');

  const logTail = deploymentId !== 'unknown' ? await fetchBuildLogTail(deploymentId) : '';

  // Record the attempt synchronously so the UI banner can appear
  // even while Dify is still drafting.
  const event: RecoveryEvent = recordRecoveryAttempt({
    deploymentId,
    deploymentUrl: dep?.url ? `https://${dep.url}` : null,
    projectName,
    state: 'ERROR',
    errorSummary: `${errorSummary}\n\n${logTail}`,
    difyConversationId: null,
    status: 'drafting-fix',
  });

  // Kick off the Dify repair turn in the background; update the ring
  // when the conversation id is available.
  void (async () => {
    const convId = await dispatchRepairTurn(
      projectName ?? 'valhalla-app',
      String(errorSummary),
      logTail,
    );
    updateRecovery(event.id, {
      status: convId ? 'fix-ready' : 'failed-to-repair',
      difyConversationId: convId,
    });
  })();

  return new Response(
    JSON.stringify({
      ok: true,
      recoveryId: event.id,
      attempt: event.attempt,
      maxAttempts: event.maxAttempts,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
  );
}
