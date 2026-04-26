/**
 * Valhalla AI — Prometheus PR 2: Frontend Supremacy.
 *
 * Extract `<think>...</think>` reasoning regions from the streaming
 * assistant content. Anthropic's extended-thinking blocks (and
 * the orchestrator's deliberate `<think>` markers from EIVOR /
 * ODIN replans) arrive interleaved with the user-visible response;
 * we lift them out so MessageBubble can render the inner monologue
 * in a collapsible panel above the answer instead of polluting
 * the main bubble.
 *
 * The extractor is tolerant of:
 *   - mid-stream open `<think>` with no closing tag yet
 *     (rendered with `isStreaming: true`)
 *   - nested `<think>` blocks (flattened — only the outermost pair
 *     is treated as the boundary; nested opens are kept as text)
 *   - case-insensitive tags
 */

export interface ThinkBlock {
  /** Stable id derived from message id + index. */
  id: string;
  /** Free-form reasoning text between the open/close pair. */
  text: string;
  /**
   * `true` if the closing tag has not yet been observed in the
   * source text. The bubble shows a typing cursor in that case.
   */
  isStreaming: boolean;
}

export interface ThinkExtraction {
  /** Source content with all `<think>...</think>` regions stripped. */
  visible: string;
  blocks: ThinkBlock[];
}

const OPEN_RE = /<think>/i;
const CLOSE_RE = /<\/think>/i;

export function extractThink(text: string, messageId: string): ThinkExtraction {
  if (!text || !OPEN_RE.test(text)) {
    return { visible: text, blocks: [] };
  }

  const blocks: ThinkBlock[] = [];
  let visible = '';
  let cursor = 0;
  let index = 0;

  while (cursor < text.length) {
    const tail = text.slice(cursor);
    const openMatch = tail.match(OPEN_RE);
    if (!openMatch || openMatch.index === undefined) {
      visible += tail;
      break;
    }
    visible += tail.slice(0, openMatch.index);
    const afterOpen = cursor + openMatch.index + openMatch[0].length;

    const rest = text.slice(afterOpen);
    const closeMatch = rest.match(CLOSE_RE);
    if (!closeMatch || closeMatch.index === undefined) {
      // Unclosed — still streaming. Keep the rest as a streaming block.
      blocks.push({
        id: `${messageId}-think-${index++}`,
        text: rest,
        isStreaming: true,
      });
      cursor = text.length;
      break;
    }

    const inner = rest.slice(0, closeMatch.index);
    blocks.push({
      id: `${messageId}-think-${index++}`,
      text: inner,
      isStreaming: false,
    });
    cursor = afterOpen + closeMatch.index + closeMatch[0].length;
  }

  return { visible, blocks };
}
