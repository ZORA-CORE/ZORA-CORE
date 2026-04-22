export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  /** Dify-side message id, captured from the SSE stream. Used for
   *  the 'Correct the Gods' feedback call. */
  difyMessageId?: string;
  /** Feedback the user has left on this assistant message. */
  feedback?: 'like' | 'dislike' | null;
}

export interface AgentPhase {
  id: string;
  label: string;
  icon: string;
}

export const AGENT_PHASES: AgentPhase[] = [
  { id: 'odin', label: 'Odin is architecting…', icon: '◆' },
  { id: 'thor', label: 'Thor is forging backend…', icon: '⚡' },
  { id: 'freja', label: 'Freja is designing UI…', icon: '✦' },
  { id: 'eivor', label: 'Eivor is recalling context…', icon: '◎' },
];

/**
 * A file the user has attached to their next message. We keep both the
 * local `File` (for preview/chip rendering) and the Dify-side reference
 * returned from `/api/chat/upload`.
 */
export interface AttachedFile {
  /** Local id for React keys; unrelated to the Dify id. */
  clientId: string;
  name: string;
  size: number;
  mimeType: string;
  /** Dify file id returned from `/v1/files/upload`. */
  difyId: string;
  /** Dify file kind, derived from mimeType. */
  kind: 'image' | 'document' | 'audio' | 'video' | 'custom';
}

export interface ChatSubmission {
  /** The textual query (may be empty if attachments carry the payload). */
  text: string;
  /** Already-uploaded files to attach to this message. */
  files: AttachedFile[];
  /** Optional URL the user wants the swarm to analyse. */
  url?: string;
}

export function kindFromMime(mime: string): AttachedFile['kind'] {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  if (
    mime === 'application/pdf' ||
    mime.includes('word') ||
    mime.includes('text') ||
    mime.includes('spreadsheet') ||
    mime.includes('presentation')
  ) {
    return 'document';
  }
  return 'custom';
}
