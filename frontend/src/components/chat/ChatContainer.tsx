'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Brain, Download, PanelRightOpen, Ship, Shield } from 'lucide-react';
import { buildSessionBundle, triggerBrowserDownload } from './bundle';
import { buildValkyrieBundle } from './valkyrie';
import { ShipModal } from './ShipModal';
import { ChatInput, type ChatInputHandle } from './ChatInput';
import { ChatSidebar } from './ChatSidebar';
import { EivorMemoryPanel } from './EivorMemoryPanel';
import { EmptyState } from './EmptyState';
import { ForgePanel } from './ForgePanel';
import { MessageBubble } from './MessageBubble';
import { ThemeProvider } from './ThemeProvider';
import { extractArtifacts, type Artifact, type ThoughtEvent } from './artifacts';
import { extractMemory } from './memory';
import {
  loadActiveThreadId,
  loadThreads,
  saveActiveThreadId,
  saveThreads,
  titleFromMessage,
  type ChatThread,
} from './threadStore';
import type { AttachedFile, ChatMessage, ChatSubmission } from './types';

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
  /** Dify message id surfaced on agent_message / message_end. */
  id?: string;
  message_id?: string;
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

interface ChatContainerInnerProps {
  /**
   * Optional thread id provided by the `/chat/[chatId]` dynamic route.
   * When set, the component hydrates with this thread instead of the
   * last-active one in localStorage. Unknown ids fall back to an empty
   * chat so the user can start typing immediately.
   */
  initialChatId?: string;
}

function ChatContainerInner({ initialChatId }: ChatContainerInnerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string>('');
  const [thoughts, setThoughts] = useState<ThoughtEvent[]>([]);
  const [forgeOpen, setForgeOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);
  const [userId, setUserId] = useState<string>('valhalla-ssr');
  const [bundling, setBundling] = useState(false);

  // Threads sidebar state
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const userIdRef = useRef<string>('valhalla-ssr');
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<ChatInputHandle>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const thoughtCounterRef = useRef(0);
  const activeThreadIdRef = useRef<string | null>(null);
  const conversationIdRef = useRef<string>('');
  const hydratedRef = useRef(false);

  // Hydrate user id + threads + sidebar state from localStorage once.
  useEffect(() => {
    const id = getOrCreateUserId();
    userIdRef.current = id;
    setUserId(id);

    const stored = loadThreads();
    setThreads(stored);

    // Route-driven hydration wins when /chat/[chatId] is open. If the
    // thread exists locally we flash it in synchronously; otherwise
    // the component boots empty and the user can send a message that
    // will bind to this id.
    const routedId =
      initialChatId && typeof initialChatId === 'string' && initialChatId.length > 0
        ? initialChatId
        : null;
    const lastActive = loadActiveThreadId();
    const targetId = routedId ?? lastActive;
    const target = targetId ? stored.find((t) => t.id === targetId) : null;
    if (target) {
      setActiveThreadId(target.id);
      activeThreadIdRef.current = target.id;
      setMessages(target.messages);
      setConversationId(target.conversationId);
      conversationIdRef.current = target.conversationId;
    } else if (routedId) {
      setActiveThreadId(routedId);
      activeThreadIdRef.current = routedId;
    }

    try {
      const collapsed = window.localStorage.getItem('valhalla.sidebar.collapsed');
      if (collapsed === '1') setSidebarCollapsed(true);
    } catch {
      /* ignore */
    }

    hydratedRef.current = true;
  }, []);

  // Keep the active-conversation-id ref in sync so the SSE handler
  // resolves the right thread even if the user switches mid-stream.
  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);
  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
    saveActiveThreadId(activeThreadId);
  }, [activeThreadId]);

  // Auto-scroll the chat to the bottom whenever a new message or token arrives.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isStreaming]);

  // Persist the active thread's messages whenever they change. We only
  // write AFTER initial hydration so we don't overwrite stored state
  // with an empty initial render.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const activeId = activeThreadIdRef.current;
    if (!activeId) return;
    if (messages.length === 0) return;

    setThreads((prev) => {
      const existing = prev.find((t) => t.id === activeId);
      if (!existing) return prev;
      const title = existing.title === 'New chat'
        ? titleFromMessage(messages[0]?.content ?? '')
        : existing.title;
      const updated: ChatThread = {
        ...existing,
        title,
        messages,
        conversationId: conversationIdRef.current,
        updatedAt: Date.now(),
      };
      const next = [updated, ...prev.filter((t) => t.id !== activeId)];
      saveThreads(next);
      return next;
    });
  }, [messages]);

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

  const memory = useMemo(() => extractMemory(messages), [messages]);

  const handleFeedback = useCallback(
    (messageId: string, rating: 'like' | 'dislike' | null): void => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, feedback: rating } : m)),
      );
    },
    [],
  );

  const handleDownloadBundle = useCallback(
    async (variant: 'session' | 'valkyrie' = 'session'): Promise<void> => {
      if (bundling) return;
      setBundling(true);
      try {
        const { blob, filename } =
          variant === 'valkyrie'
            ? await buildValkyrieBundle(artifacts, messages)
            : await buildSessionBundle(artifacts, messages);
        triggerBrowserDownload(blob, filename);
      } catch (err) {
        setError(
          err instanceof Error
            ? `Bundle failed: ${err.message}`
            : 'Bundle failed.',
        );
      } finally {
        setBundling(false);
      }
    },
    [artifacts, messages, bundling],
  );

  const ensureActiveThread = useCallback((): string => {
    const existing = activeThreadIdRef.current;
    if (existing) return existing;
    const id = makeId();
    const thread: ChatThread = {
      id,
      title: 'New chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      conversationId: '',
      messages: [],
    };
    activeThreadIdRef.current = id;
    setActiveThreadId(id);
    setThreads((prev) => {
      const next = [thread, ...prev];
      saveThreads(next);
      return next;
    });
    return id;
  }, []);

  const sendMessage = useCallback(
    async ({ text, files }: ChatSubmission): Promise<void> => {
      setError(null);
      ensureActiveThread();
      const userMsg: ChatMessage = {
        id: makeId(),
        role: 'user',
        content:
          text +
          (files.length > 0
            ? `\n\n_Attached:_ ${files.map((f) => `\`${f.name}\``).join(', ')}`
            : ''),
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
        const difyFiles = files.map((f: AttachedFile) => ({
          type: f.kind,
          transfer_method: 'local_file',
          upload_file_id: f.difyId,
        }));
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: text,
            user: userIdRef.current,
            conversation_id: conversationIdRef.current || undefined,
            inputs: {},
            files: difyFiles,
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
              const difyId = parsed.message_id || parsed.id;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: accumulated,
                        difyMessageId: m.difyMessageId ?? difyId,
                      }
                    : m,
                ),
              );
            }

            if (parsed.event === 'message_end') {
              const difyId = parsed.message_id || parsed.id;
              if (difyId) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, difyMessageId: m.difyMessageId ?? difyId }
                      : m,
                  ),
                );
              }
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
    [ensureActiveThread],
  );

  const handleStop = useCallback((): void => {
    abortRef.current?.abort();
  }, []);

  const handleQuickStart = useCallback((prompt: string): void => {
    inputRef.current?.setValue(prompt);
  }, []);

  const resetConversationState = useCallback((): void => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setConversationId('');
    conversationIdRef.current = '';
    setError(null);
    setIsStreaming(false);
    setThoughts([]);
    thoughtCounterRef.current = 0;
    setForgeOpen(false);
    setMemoryOpen(false);
  }, []);

  const handleNewChat = useCallback((): void => {
    resetConversationState();
    activeThreadIdRef.current = null;
    setActiveThreadId(null);
  }, [resetConversationState]);

  const handleSelectThread = useCallback(
    (id: string): void => {
      const target = threads.find((t) => t.id === id);
      if (!target) return;
      resetConversationState();
      activeThreadIdRef.current = id;
      setActiveThreadId(id);
      setMessages(target.messages);
      setConversationId(target.conversationId);
      conversationIdRef.current = target.conversationId;
    },
    [threads, resetConversationState],
  );

  const handleDeleteThread = useCallback(
    (id: string): void => {
      setThreads((prev) => {
        const next = prev.filter((t) => t.id !== id);
        saveThreads(next);
        return next;
      });
      if (activeThreadIdRef.current === id) {
        resetConversationState();
        activeThreadIdRef.current = null;
        setActiveThreadId(null);
      }
    },
    [resetConversationState],
  );

  const handleToggleSidebar = useCallback((): void => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem('valhalla.sidebar.collapsed', next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
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
    <div className="flex h-[100dvh] w-full bg-white text-neutral-900 dark:bg-[#212121] dark:text-neutral-100">
      <ChatSidebar
        threads={threads}
        activeThreadId={activeThreadId}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={handleToggleSidebar}
        onNewChat={handleNewChat}
        onSelectThread={handleSelectThread}
        onDeleteThread={handleDeleteThread}
      />

      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 bg-white/70 px-5 backdrop-blur-xl dark:border-neutral-800 dark:bg-[#212121]/80">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight">Valhalla AI</span>
            <span className="hidden text-xs text-neutral-500 dark:text-neutral-400 sm:inline">
              · Forging Future Systems
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMemoryOpen(true)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              title="EIVOR Memory"
            >
              <Brain className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Memory</span>
            </button>
            {artifacts.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => void handleDownloadBundle('session')}
                  disabled={bundling}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 disabled:opacity-50"
                  title="Download session bundle (code + Mermaid + README + vercel.json)"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {bundling ? 'Bundling…' : 'Download'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleDownloadBundle('valkyrie')}
                  disabled={bundling}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#008FBF] transition hover:bg-[#E6FAFF]/60 dark:text-[#66ddff] dark:hover:bg-[#0d3340]/40 disabled:opacity-50"
                  title="Valkyrie bundle — session zip + GH Actions + Cloudflare Worker + Supabase migration + deploy.sh"
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Valkyrie</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShipOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-[#008FBF] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#0077A3]"
                  title="Ship — create a new GitHub repo and commit the entire Valkyrie bundle in one atomic commit"
                >
                  <Ship className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Ship</span>
                </button>
              </>
            )}
            {(artifacts.length > 0 || thoughts.length > 0) && !forgeOpen && (
              <button
                type="button"
                onClick={() => setForgeOpen(true)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              >
                <PanelRightOpen className="h-3.5 w-3.5" />
                Open Forge
              </button>
            )}
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
                      userId={userId}
                      onFeedback={handleFeedback}
                    />
                  ))}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-neutral-200 bg-white/80 backdrop-blur-xl dark:border-neutral-800 dark:bg-[#212121]/80">
              <ChatInput
                ref={inputRef}
                onSubmit={sendMessage}
                onStop={handleStop}
                isStreaming={isStreaming}
                userId={userId}
              />
              {error && !isStreaming && (
                <div className="mx-auto mb-3 w-full max-w-[800px] px-4">
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-300">
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
                className="hidden min-h-0 w-full max-w-[620px] shrink-0 lg:flex lg:w-[48%]"
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

        <EivorMemoryPanel
          open={memoryOpen}
          memory={memory}
          onClose={() => setMemoryOpen(false)}
        />

        <ShipModal
          open={shipOpen}
          artifacts={artifacts}
          messages={messages}
          onClose={() => setShipOpen(false)}
        />
      </div>
    </div>
  );
}

export interface ChatContainerProps {
  initialChatId?: string;
}

export function ChatContainer(props: ChatContainerProps = {}) {
  // `ThemeProvider` is now a pass-through shim — actual theming is
  // owned by the root `ValhallaThemeProvider` in `src/app/layout.tsx`.
  // We keep the wrapper for call-site compatibility but no longer
  // establish a nested context here.
  return (
    <ThemeProvider>
      <ChatContainerInner initialChatId={props.initialChatId} />
    </ThemeProvider>
  );
}
