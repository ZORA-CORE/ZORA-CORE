'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PanelRightOpen } from 'lucide-react';
import { AgentStatusPulse } from './AgentStatusPulse';
import { ChatInput, type ChatInputHandle } from './ChatInput';
import { EmptyState } from './EmptyState';
import { ForgePanel } from './ForgePanel';
import { MessageBubble } from './MessageBubble';
import { extractArtifacts, type Artifact, type ThoughtEvent } from './artifacts';
import type { ChatMessage } from './types';

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return 'valhalla-ssr';
  try {
    // Preserve the historical Zoracore key so returning users keep the same
    // Dify conversation identity after the rebrand.
    const existing =
      window.localStorage.getItem('valhalla.chat.user_id') ||
      window.localStorage.getItem('zoracore.chat.user_id');
    if (existing) {
      window.localStorage.setItem('valhalla.chat.user_id', existing);
      return existing;
    }
    const created = `valhalla_${makeId()}`;
    window.localStorage.setItem('valhalla.chat.user_id', created);
    return created;
  } catch {
    return `valhalla_${makeId()}`;
  }
}

interface DifySSEEvent {
  event?: string;
  answer?: string;
  conversation_id?: string;
  message?: string;
  status?: number;
  code?: string;
  thought?: string;
  tool?: string;
  tool_input?: unknown;
  observation?: string;
  data?: {
    title?: string;
    node_type?: string;
    status?: string;
    outputs?: unknown;
  };
}

function thoughtFromEvent(
  e: DifySSEEvent,
  idx: number,
): ThoughtEvent | null {
  const ev = e.event ?? '';
  switch (ev) {
    case 'agent_thought': {
      const parts: string[] = [];
      if (e.thought) parts.push(e.thought);
      if (e.tool) parts.push(`tool: ${e.tool}`);
      if (e.observation) parts.push(`observation: ${e.observation}`);
      return {
        id: `t-${idx}`,
        event: ev,
        label: 'Agent reasoning',
        detail: parts.join('\n') || undefined,
        at: Date.now(),
      };
    }
    case 'workflow_started':
      return {
        id: `t-${idx}`,
        event: ev,
        label: 'Workflow started',
        detail: e.data?.title,
        at: Date.now(),
      };
    case 'workflow_finished':
      return {
        id: `t-${idx}`,
        event: ev,
        label: 'Workflow finished',
        detail: e.data?.status,
        at: Date.now(),
      };
    case 'node_started':
      return {
        id: `t-${idx}`,
        event: ev,
        label: `Node started — ${e.data?.node_type ?? 'node'}`,
        detail: e.data?.title,
        at: Date.now(),
      };
    case 'node_finished':
      return {
        id: `t-${idx}`,
        event: ev,
        label: `Node finished — ${e.data?.node_type ?? 'node'}`,
        detail: e.data?.title,
        at: Date.now(),
      };
    case 'message_end':
      return {
        id: `t-${idx}`,
        event: ev,
        label: 'Stream complete',
        at: Date.now(),
      };
    default:
      return null;
  }
}

export function ChatContainer() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string>('');
  const [thoughts, setThoughts] = useState<ThoughtEvent[]>([]);
  const [forgeOpen, setForgeOpen] = useState(false);

  const userIdRef = useRef<string>('valhalla-ssr');
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<ChatInputHandle>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const thoughtCounterRef = useRef(0);

  useEffect(() => {
    userIdRef.current = getOrCreateUserId();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isStreaming]);

  const isEmpty = messages.length === 0 && !isStreaming;

  // Extract artifacts from the current assistant message as it streams.
  const artifacts = useMemo<Artifact[]>(() => {
    const all: Artifact[] = [];
    for (const m of messages) {
      if (m.role !== 'assistant') continue;
      all.push(...extractArtifacts(m.content, m.id));
    }
    return all;
  }, [messages]);

  // Auto-open the Forge the first time an artifact lands.
  useEffect(() => {
    if (!forgeOpen && artifacts.length > 0) setForgeOpen(true);
  }, [artifacts.length, forgeOpen]);

  const sendMessage = useCallback(
    async (query: string): Promise<void> => {
      setError(null);
      const userMsg: ChatMessage = {
        id: makeId(),
        role: 'user',
        content: query,
        createdAt: Date.now(),
      };
      const assistantId = makeId();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            user: userIdRef.current,
            conversation_id: conversationId || undefined,
            inputs: {},
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => '');
          let message = text;
          try {
            const parsed = JSON.parse(text) as { error?: string; message?: string };
            message = parsed.error || parsed.message || text;
          } catch {
            /* not JSON, use raw text */
          }
          throw new Error(message || `Request failed with status ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulated = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // SSE frames are separated by a blank line.
          let separatorIndex: number;
          while ((separatorIndex = buffer.indexOf('\n\n')) !== -1) {
            const rawFrame = buffer.slice(0, separatorIndex);
            buffer = buffer.slice(separatorIndex + 2);

            const dataLines = rawFrame
              .split('\n')
              .filter((line) => line.startsWith('data:'))
              .map((line) => line.slice(5).trim());

            if (dataLines.length === 0) continue;
            const dataStr = dataLines.join('\n');
            if (!dataStr || dataStr === '[DONE]') continue;

            let parsed: DifySSEEvent;
            try {
              parsed = JSON.parse(dataStr) as DifySSEEvent;
            } catch {
              continue;
            }

            if (parsed.event === 'error') {
              throw new Error(parsed.message || 'Streaming error.');
            }

            if (parsed.conversation_id) {
              setConversationId((current) => current || parsed.conversation_id!);
            }

            if (
              (parsed.event === 'message' || parsed.event === 'agent_message') &&
              typeof parsed.answer === 'string'
            ) {
              accumulated += parsed.answer;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: accumulated } : m,
                ),
              );
            }

            const thought = thoughtFromEvent(parsed, thoughtCounterRef.current);
            if (thought) {
              thoughtCounterRef.current += 1;
              setThoughts((prev) => [...prev, thought]);
            }
          }
        }

        // Finalize: if no content streamed, show a fallback.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId && m.content === ''
              ? { ...m, content: '_(No response received.)_' }
              : m,
          ),
        );
      } catch (err) {
        const aborted =
          err instanceof DOMException && err.name === 'AbortError';
        if (!aborted) {
          const message = err instanceof Error ? err.message : String(err);
          setError(message);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content:
                      m.content ||
                      `**Connection error.** ${message}\n\nPlease try again.`,
                  }
                : m,
            ),
          );
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId && m.content === ''
                ? { ...m, content: '_(Stopped.)_' }
                : m,
            ),
          );
        }
      } finally {
        abortRef.current = null;
        setIsStreaming(false);
      }
    },
    [conversationId],
  );

  const handleStop = useCallback((): void => {
    abortRef.current?.abort();
  }, []);

  const handleQuickStart = useCallback((prompt: string): void => {
    inputRef.current?.setValue(prompt);
  }, []);

  const handleNewChat = useCallback((): void => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setConversationId('');
    setError(null);
    setIsStreaming(false);
    setThoughts([]);
    thoughtCounterRef.current = 0;
    setForgeOpen(false);
  }, []);

  const progressBar = useMemo(
    () => (
      <AnimatePresence>
        {isStreaming && (
          <motion.div
            key="progress"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="sticky top-0 z-10 h-[2px] w-full overflow-hidden bg-transparent"
          >
            <motion.div
              className="h-full w-1/3 bg-gradient-to-r from-[#00CCFF] via-[#00CCFF]/70 to-transparent"
              initial={{ x: '-100%' }}
              animate={{ x: '300%' }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    ),
    [isStreaming],
  );

  const showForge = forgeOpen && (artifacts.length > 0 || thoughts.length > 0);

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-white text-[#1D1D1F]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#F0F0F2] bg-white/70 px-5 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <svg
            width="22"
            height="22"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M16 3 L29 10 V22 L16 29 L3 22 V10 Z"
              stroke="#1D1D1F"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M16 9 L23 13 V19 L16 23 L9 19 V13 Z"
              stroke="#00CCFF"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-sm font-semibold tracking-tight">Valhalla AI</span>
          <span className="hidden text-xs text-[#9b9ba3] sm:inline">
            · Forging Future Systems
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(artifacts.length > 0 || thoughts.length > 0) && !forgeOpen && (
            <button
              type="button"
              onClick={() => setForgeOpen(true)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#6E6E73] transition hover:bg-[#F5F5F7] hover:text-[#1D1D1F]"
            >
              <PanelRightOpen className="h-3.5 w-3.5" />
              Open Forge
            </button>
          )}
          <button
            type="button"
            onClick={handleNewChat}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#6E6E73] transition hover:bg-[#F5F5F7] hover:text-[#1D1D1F]"
          >
            New chat
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <section
          className={`relative flex min-h-0 flex-1 flex-col ${
            showForge ? 'lg:min-w-0' : ''
          }`}
        >
          {progressBar}

          <div className="flex-1 overflow-y-auto">
            {isEmpty ? (
              <EmptyState onSelect={handleQuickStart} />
            ) : (
              <div className="mx-auto flex w-full max-w-[800px] flex-col gap-5 px-4 py-8">
                {messages.map((m, i) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    isStreaming={
                      isStreaming &&
                      i === messages.length - 1 &&
                      m.role === 'assistant'
                    }
                  />
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-[#F0F0F2] bg-white/80 backdrop-blur-xl">
            <div className="mx-auto w-full max-w-[800px] px-4 pt-3">
              <AgentStatusPulse active={isStreaming} />
            </div>
            <ChatInput
              ref={inputRef}
              onSubmit={sendMessage}
              onStop={handleStop}
              isStreaming={isStreaming}
            />
            {error && !isStreaming && (
              <div className="mx-auto mb-3 w-full max-w-[800px] px-4">
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              </div>
            )}
          </div>
        </section>

        <AnimatePresence initial={false}>
          {showForge && (
            <motion.section
              key="forge"
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="hidden min-h-0 w-full max-w-[560px] shrink-0 lg:flex lg:w-[48%]"
            >
              <ForgePanel
                artifacts={artifacts}
                thoughts={thoughts}
                isStreaming={isStreaming}
                onClose={() => setForgeOpen(false)}
              />
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Forge: slide-over over the chat */}
      <AnimatePresence>
        {showForge && (
          <motion.div
            key="forge-mobile"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-x-0 bottom-0 top-14 z-30 flex lg:hidden"
          >
            <ForgePanel
              artifacts={artifacts}
              thoughts={thoughts}
              isStreaming={isStreaming}
              onClose={() => setForgeOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
