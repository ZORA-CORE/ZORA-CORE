/**
 * Artifact extraction for the Valhalla Forge.
 *
 * The assistant streams markdown with fenced code blocks and mermaid
 * diagrams. As bytes arrive we need to surface the in-progress artifact in
 * the Forge (right pane) incrementally — even before its closing fence
 * lands. The last unclosed block is marked `isStreaming` so the UI can
 * render a live cursor.
 */

export type ArtifactKind = 'code' | 'mermaid';

export interface Artifact {
  id: string;
  kind: ArtifactKind;
  language: string;
  code: string;
  isStreaming: boolean;
  /** Source message id the artifact was extracted from. */
  messageId: string;
  /** Monotonic index within the message (0-based). */
  index: number;
}

const FENCE_RE = /```(\w+)?\n([\s\S]*?)(```|$)/g;

/**
 * Walk the accumulated assistant text and emit a stable list of artifacts.
 * The last block is flagged `isStreaming` when its closing fence has not
 * yet been received.
 */
export function extractArtifacts(text: string, messageId: string): Artifact[] {
  if (!text) return [];
  const artifacts: Artifact[] = [];
  const clone = new RegExp(FENCE_RE.source, 'g');
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = clone.exec(text)) !== null) {
    const rawLang = (match[1] || '').toLowerCase();
    const code = match[2] ?? '';
    const closed = match[3] === '```';
    const kind: ArtifactKind = rawLang === 'mermaid' ? 'mermaid' : 'code';
    artifacts.push({
      id: `${messageId}-${index}`,
      kind,
      language: rawLang || 'text',
      code,
      isStreaming: !closed,
      messageId,
      index,
    });
    index += 1;
  }
  return artifacts;
}

export interface ThoughtEvent {
  id: string;
  /** Short human label, e.g. "Agent reasoning" or "Workflow: node started". */
  label: string;
  /** Optional detail body (free-form). */
  detail?: string;
  /** Monotonic timestamp for ordering. */
  at: number;
  /** Raw Dify event name for diagnostics. */
  event: string;
}
