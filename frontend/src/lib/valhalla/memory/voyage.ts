/**
 * Valhalla AI — Infinity Engine: Voyage AI embeddings wrapper.
 *
 * Voyage is Anthropic's officially recommended embeddings partner —
 * since Anthropic doesn't ship an embeddings endpoint of its own,
 * staying inside the Claude ecosystem means Voyage. `voyage-3` is the
 * current SOTA general-purpose retrieval model at 1024 dimensions.
 *
 * The wrapper is deliberately thin: one `embed(text, kind)` entry
 * point that returns a fixed-length vector or throws with a useful
 * error. Network timeouts are bounded so a misbehaving Voyage endpoint
 * can't stall the orchestrator indefinitely.
 */
export const VOYAGE_MODEL = 'voyage-3';
export const VOYAGE_DIM = 1024;
export const VOYAGE_BASE = 'https://api.voyageai.com/v1';
/** Hard timeout for a single embedding call. Voyage typically returns in <500ms. */
const VOYAGE_TIMEOUT_MS = 10_000;

/** `input_type` is a Voyage-specific hint that measurably improves recall. */
export type VoyageInputType = 'query' | 'document';

export class VoyageError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'VoyageError';
  }
}

/**
 * Embed a single text. Returns a Float64Array-compatible number[] of
 * length `VOYAGE_DIM`. Throws `VoyageError` if Voyage is unreachable,
 * mis-configured, or returns an unexpected shape.
 */
export async function embedText(
  text: string,
  inputType: VoyageInputType = 'query',
  signal?: AbortSignal,
): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new VoyageError(
      'VOYAGE_API_KEY is not set. Set it in the environment to enable ' +
        'Valhalla episodic memory (see frontend/.env.example).',
    );
  }
  if (typeof text !== 'string' || text.length === 0) {
    throw new VoyageError('embedText requires a non-empty string input.');
  }

  // Compose our own AbortController so we can add the per-call timeout
  // while still honoring an externally-provided signal (e.g. the
  // orchestrator's streaming cancel).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('voyage timeout')), VOYAGE_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timer);
      throw new VoyageError('Aborted before Voyage request started.');
    }
    signal.addEventListener('abort', onExternalAbort, { once: true });
  }

  try {
    const res = await fetch(`${VOYAGE_BASE}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: VOYAGE_MODEL,
        input: [text],
        input_type: inputType,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new VoyageError(
        `Voyage returned ${res.status}: ${body.slice(0, 400)}`,
        res.status,
      );
    }

    const json = (await res.json()) as {
      data?: Array<{ embedding?: number[] }>;
    };
    const embedding = json.data?.[0]?.embedding;
    if (!Array.isArray(embedding) || embedding.length !== VOYAGE_DIM) {
      throw new VoyageError(
        `Voyage returned an unexpected embedding shape (len=${embedding?.length}; expected ${VOYAGE_DIM}).`,
      );
    }
    return embedding;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onExternalAbort);
  }
}
