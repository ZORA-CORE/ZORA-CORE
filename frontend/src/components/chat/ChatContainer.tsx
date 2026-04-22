'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AgentStatusPulse } from './AgentStatusPulse';
import { ChatInput, type ChatInputHandle } from './ChatInput';
import { EmptyState } from './EmptyState';
import { MessageBubble } from './MessageBubble';
import type { ChatMessage } from './types';

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return 'zoracore-ssr';
  try {
    const existing = window.localStorage.getItem('zoracore.chat.user_id');
    if (existing) return existing;
    const created = `zoracore_${makeId()}`;
    window.localStorage.setItem('zoracore.chat.user_id', created);
    return created;
  } catch {
    return `zoracore_${makeId()}`;
  }
}

interface DifySSEEvent {
  event?: string;
  answer?: string;
  conversation_id?: string;
  message?: string;
  status?: number;
  code?: string;
}

export function ChatContainer() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string>('');

  const userIdRef = useRef<string>('zoracore-ssr');
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<ChatInputHandle>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    userIdRef.current = getOrCreateUserId();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isStreaming]);

  const isEmpty = messages.length === 0 && !isStreaming;

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

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-white text-[#1D1D1F]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#F0F0F2] px-5">
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
          <span className="text-sm font-semibold tracking-tight">Zoracore</span>
          <span className="hidden text-xs text-[#9b9ba3] sm:inline">
            · Divine Nordic Intelligence
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            abortRef.current?.abort();
            abortRef.current = null;
            setMessages([]);
            setConversationId('');
            setError(null);
            setIsStreaming(false);
          }}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#6E6E73] transition hover:bg-[#F5F5F7] hover:text-[#1D1D1F]"
        >
          New chat
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col">
        {progressBar}

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {isEmpty ? (
            <EmptyState onSelect={handleQuickStart} />
          ) : (
            <div className="mx-auto flex w-full max-w-[800px] flex-col gap-5 px-4 py-8">
              {messages.map((m, i) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  isStreaming={
                    isStreaming && i === messages.length - 1 && m.role === 'assistant'
                  }
                />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-[#F0F0F2] bg-white">
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
      </div>
    </div>
  );
}
