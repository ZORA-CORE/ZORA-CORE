/**
 * Valhalla AI — in-memory log of Vercel deploy-failure recovery attempts.
 *
 * This is intentionally not persistent. Phase 2 Slice B will swap it for
 * a Supabase-backed store once those secrets land. The in-memory ring is
 * sufficient for the Phase 3 goal: show the user *"a deploy just failed,
 * the swarm is drafting a fix"* without blocking on infra we don't have.
 *
 * Exported as a module singleton so the webhook route and the
 * recoveries-poll route share the same ring across hot-reloads within a
 * single Node lambda. Stateless serverless invocations will see an empty
 * ring; that's acceptable for a UX-level banner.
 */

export interface RecoveryEvent {
  id: string;
  deploymentId: string;
  deploymentUrl: string | null;
  projectName: string | null;
  state: 'ERROR' | 'CANCELED' | 'BUILD_ERROR' | 'OTHER';
  status: 'drafting-fix' | 'fix-ready' | 'failed-to-repair' | 'recovered';
  attempt: number;
  maxAttempts: number;
  errorSummary: string;
  difyConversationId: string | null;
  createdAt: number;
  updatedAt: number;
}

const MAX_RING = 50;
const MAX_ATTEMPTS = 3;

// `globalThis` so Next.js dev hot-reload doesn't wipe the ring on every
// file change.
const globalKey = Symbol.for('valhalla.vercelRecoveryRing');
interface RingContainer {
  ring: RecoveryEvent[];
  attemptsByDeployment: Map<string, number>;
}
const g = globalThis as unknown as Record<symbol, RingContainer | undefined>;
if (!g[globalKey]) {
  g[globalKey] = { ring: [], attemptsByDeployment: new Map() };
}
const store = g[globalKey] as RingContainer;

export function recordRecoveryAttempt(input: {
  deploymentId: string;
  deploymentUrl: string | null;
  projectName: string | null;
  state: RecoveryEvent['state'];
  errorSummary: string;
  difyConversationId: string | null;
  status?: RecoveryEvent['status'];
}): RecoveryEvent {
  const prior = store.attemptsByDeployment.get(input.deploymentId) ?? 0;
  const attempt = prior + 1;
  store.attemptsByDeployment.set(input.deploymentId, attempt);

  const event: RecoveryEvent = {
    id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    deploymentId: input.deploymentId,
    deploymentUrl: input.deploymentUrl,
    projectName: input.projectName,
    state: input.state,
    status: input.status ?? 'drafting-fix',
    attempt,
    maxAttempts: MAX_ATTEMPTS,
    errorSummary: input.errorSummary.slice(0, 2000),
    difyConversationId: input.difyConversationId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  store.ring.push(event);
  if (store.ring.length > MAX_RING) store.ring.splice(0, store.ring.length - MAX_RING);

  return event;
}

export function updateRecovery(
  id: string,
  patch: Partial<Pick<RecoveryEvent, 'status' | 'difyConversationId' | 'errorSummary'>>,
): RecoveryEvent | null {
  const idx = store.ring.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  const prev = store.ring[idx];
  const next: RecoveryEvent = { ...prev, ...patch, updatedAt: Date.now() };
  store.ring[idx] = next;
  return next;
}

export function listRecoveries(limit = 20): RecoveryEvent[] {
  return store.ring.slice(-limit).reverse();
}

export function hasExhaustedAttempts(deploymentId: string): boolean {
  return (store.attemptsByDeployment.get(deploymentId) ?? 0) >= MAX_ATTEMPTS;
}

export { MAX_ATTEMPTS };
