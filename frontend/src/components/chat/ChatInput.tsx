'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import {
  ArrowUp,
  FileText,
  ImageIcon,
  Link2,
  Mic,
  MicOff,
  Paperclip,
  Square,
  X,
} from 'lucide-react';
import { isVoiceSupported, startVoice, type VoiceSession } from './voice';
import {
  kindFromMime,
  type AttachedFile,
  type ChatSubmission,
} from './types';

export interface ChatInputHandle {
  focus: () => void;
  setValue: (value: string) => void;
}

interface ChatInputProps {
  onSubmit: (payload: ChatSubmission) => void;
  onStop: () => void;
  isStreaming: boolean;
  userId: string;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_FILES = 5;

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(function ChatInput(
  {
    onSubmit,
    onStop,
    isStreaming,
    userId,
    disabled = false,
    placeholder = 'Ask Valhalla to forge, architect, or refactor…',
  },
  ref,
) {
  const [value, setValue] = useState('');
  const [interimVoice, setInterimVoice] = useState('');
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [showUrl, setShowUrl] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  // Synchronous guard that closes the window between resetting the form
  // and the parent flipping isStreaming=true inside the async onSubmit.
  // Without this, a second submit could fire during composePrompt()'s
  // URL fetch and start a duplicate stream.
  const [submitting, setSubmitting] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceRef = useRef<VoiceSession | null>(null);

  useEffect(() => {
    setVoiceSupported(isVoiceSupported());
  }, []);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    setValue: (v: string) => {
      setValue(v);
      requestAnimationFrame(() => textareaRef.current?.focus());
    },
  }));

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value, interimVoice]);

  const parsePdf = useCallback(
    async (clientId: string, file: File): Promise<void> => {
      try {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/api/chat/parse-pdf', {
          method: 'POST',
          body: form,
        });
        if (!res.ok) throw new Error(`PDF parse failed (${res.status})`);
        const data = (await res.json()) as {
          text?: string;
          pages?: number;
          characters?: number;
          truncated?: boolean;
        };
        setFiles((prev) =>
          prev.map((f) =>
            f.clientId === clientId
              ? {
                  ...f,
                  extractedText: data.text,
                  parseStatus: 'ok',
                  parseMeta: `${data.pages ?? 0} page${data.pages === 1 ? '' : 's'} · ${(
                    data.characters ?? 0
                  ).toLocaleString()} chars${data.truncated ? ' (truncated)' : ''}`,
                }
              : f,
          ),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setFiles((prev) =>
          prev.map((f) =>
            f.clientId === clientId
              ? { ...f, parseStatus: 'failed', parseMeta: msg }
              : f,
          ),
        );
      }
    },
    [],
  );

  const uploadFiles = useCallback(
    async (incoming: File[]): Promise<void> => {
      if (incoming.length === 0) return;
      if (files.length + incoming.length > MAX_FILES) {
        setUploadError(`Max ${MAX_FILES} files per message.`);
        return;
      }
      setUploadError(null);
      setUploading(true);
      try {
        const uploaded: { file: AttachedFile; raw: File; shouldParsePdf: boolean }[] = [];
        for (const file of incoming) {
          const form = new FormData();
          form.append('file', file);
          form.append('user', userId);
          const res = await fetch('/api/chat/upload', {
            method: 'POST',
            body: form,
          });
          if (!res.ok) {
            const text = await res.text().catch(() => '');
            let message = text;
            try {
              const parsed = JSON.parse(text) as {
                error?: string;
                message?: string;
              };
              message = parsed.error || parsed.message || text;
            } catch {
              /* ignore */
            }
            throw new Error(
              message || `Upload failed (${res.status}) for ${file.name}`,
            );
          }
          const data = (await res.json()) as {
            id?: string;
            mime_type?: string;
          };
          if (!data.id) throw new Error(`Upload response missing id for ${file.name}`);
          const mime = data.mime_type || file.type || 'application/octet-stream';
          const clientId = `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const isPdf = mime === 'application/pdf' || /\.pdf$/i.test(file.name);
          uploaded.push({
            file: {
              clientId,
              name: file.name,
              size: file.size,
              mimeType: mime,
              difyId: data.id,
              kind: kindFromMime(mime),
              parseStatus: isPdf ? 'parsing' : 'skipped',
            },
            raw: file,
            shouldParsePdf: isPdf,
          });
        }
        setFiles((prev) => [...prev, ...uploaded.map((u) => u.file)]);
        // Kick off PDF text extraction in parallel; doesn't block upload UI.
        for (const u of uploaded) {
          if (u.shouldParsePdf) void parsePdf(u.file.clientId, u.raw);
        }
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : String(err));
      } finally {
        setUploading(false);
      }
    },
    [files.length, parsePdf, userId],
  );

  const handleFilePicked = (e: ChangeEvent<HTMLInputElement>): void => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length > 0) void uploadFiles(picked);
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setDragActive(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) void uploadFiles(dropped);
  };

  const removeFile = (clientId: string): void => {
    setFiles((prev) => prev.filter((f) => f.clientId !== clientId));
  };

  const toggleVoice = useCallback((): void => {
    if (voiceActive) {
      voiceRef.current?.stop();
      voiceRef.current = null;
      setVoiceActive(false);
      setInterimVoice('');
      return;
    }
    const session = startVoice(
      {
        onInterim: (t) => setInterimVoice(t),
        onFinal: (t) => {
          setValue((prev) => (prev ? `${prev} ${t}` : t).trim());
          setInterimVoice('');
        },
        onError: (m) => {
          setUploadError(`Voice: ${m}`);
          setVoiceActive(false);
          setInterimVoice('');
        },
        onEnd: () => {
          setVoiceActive(false);
          setInterimVoice('');
        },
      },
      'en-US',
    );
    if (session) {
      voiceRef.current = session;
      setVoiceActive(true);
    }
  }, [voiceActive]);

  const composePrompt = useCallback(
    async (
      baseText: string,
      baseUrl: string | null,
      attachments: AttachedFile[],
    ): Promise<string> => {
      const blocks: string[] = [];

      // Inject any extracted PDF text as system-style context.
      const extracted = attachments.filter((f) => f.extractedText);
      for (const f of extracted) {
        blocks.push(
          `--- Extracted from ${f.name} (${f.parseMeta ?? 'document'}) ---\n${
            f.extractedText
          }\n--- end ${f.name} ---`,
        );
      }

      // Fetch URL content server-side if a URL is present.
      if (baseUrl) {
        try {
          const res = await fetch('/api/chat/parse-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: baseUrl }),
          });
          if (res.ok) {
            const data = (await res.json()) as {
              title?: string;
              text?: string;
              characters?: number;
              truncated?: boolean;
            };
            blocks.push(
              `--- Extracted from ${baseUrl}${
                data.title ? ` (“${data.title}”)` : ''
              } — ${(data.characters ?? 0).toLocaleString()} chars${
                data.truncated ? ' (truncated)' : ''
              } ---\n${data.text ?? ''}\n--- end ${baseUrl} ---`,
            );
          } else {
            blocks.push(
              `--- Could not fetch ${baseUrl} (status ${res.status}); please analyse only the available context. ---`,
            );
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          blocks.push(
            `--- Could not fetch ${baseUrl}: ${msg}; please analyse only the available context. ---`,
          );
        }
      }

      // User-facing instruction.
      let instruction: string;
      if (baseUrl && baseText) {
        instruction = `[Site analysis requested: ${baseUrl}]\n\n${baseText}`;
      } else if (baseUrl) {
        instruction = `Please analyse this URL: ${baseUrl}`;
      } else if (baseText) {
        instruction = baseText;
      } else if (attachments.length > 0) {
        instruction =
          attachments.length === 1
            ? 'Please review the attached file.'
            : `Please review the ${attachments.length} attached files.`;
      } else {
        instruction = '';
      }

      if (blocks.length === 0) return instruction;
      return `${blocks.join('\n\n')}\n\n${instruction}`;
    },
    [],
  );

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    const trimmedText = value.trim();
    const trimmedUrl = url.trim();
    const hasAttachments = files.length > 0;
    const hasUrl = Boolean(trimmedUrl);
    if (!trimmedText && !hasAttachments && !hasUrl) return;
    if (disabled || isStreaming || uploading || submitting) return;

    // Snapshot current state before reset (async URL fetch below).
    const snapshot = {
      text: trimmedText,
      url: hasUrl ? trimmedUrl : null,
      files: [...files],
    };

    // Set synchronously to close the race window — composePrompt may
    // fetch /api/chat/parse-url (up to 10s) before onSubmit fires and
    // the parent sets isStreaming=true.
    setSubmitting(true);
    setValue('');
    setFiles([]);
    setUrl('');
    setShowUrl(false);
    setUploadError(null);

    void (async () => {
      try {
        const composed = await composePrompt(snapshot.text, snapshot.url, snapshot.files);
        onSubmit({
          text: composed,
          files: snapshot.files,
          url: snapshot.url ?? undefined,
        });
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  const canSend =
    !disabled &&
    !isStreaming &&
    !uploading &&
    !submitting &&
    (value.trim().length > 0 || files.length > 0 || url.trim().length > 0);

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-[800px] px-4 pb-6 pt-2"
      onDragOver={(e) => {
        e.preventDefault();
        if (!dragActive) setDragActive(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragActive(false);
      }}
      onDrop={handleDrop}
    >
      <div
        className={`relative flex flex-col gap-2 rounded-2xl border bg-white p-2 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] transition focus-within:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,204,255,0.35)] ${
          dragActive
            ? 'border-[#00CCFF] bg-[#E6FAFF]/40'
            : 'border-[#EAEAEC] focus-within:border-[#00CCFF]/60'
        }`}
      >
        {/* Attachments chip row */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-2 pt-1">
            {files.map((f) => (
              <span
                key={f.clientId}
                className="flex items-center gap-1.5 rounded-full border border-[#EAEAEC] bg-[#F5F5F7] pl-2 pr-1 py-1 text-[11px] font-medium text-[#1D1D1F]"
                title={`${f.name} · ${Math.round(f.size / 1024)} KB${
                  f.parseMeta ? ` · ${f.parseMeta}` : ''
                }`}
              >
                {f.kind === 'image' ? (
                  <ImageIcon className="h-3.5 w-3.5 text-[#6E6E73]" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-[#6E6E73]" />
                )}
                <span className="max-w-[180px] truncate">{f.name}</span>
                {f.parseStatus === 'parsing' && (
                  <span className="text-[9px] uppercase tracking-wider text-[#008FBF]">
                    parsing…
                  </span>
                )}
                {f.parseStatus === 'ok' && f.extractedText && (
                  <span className="text-[9px] uppercase tracking-wider text-[#008FBF]">
                    parsed
                  </span>
                )}
                {f.parseStatus === 'failed' && (
                  <span className="text-[9px] uppercase tracking-wider text-red-500">
                    parse failed
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeFile(f.clientId)}
                  aria-label={`Remove ${f.name}`}
                  className="flex h-4 w-4 items-center justify-center rounded-full text-[#6E6E73] transition hover:bg-[#EAEAEC] hover:text-[#1D1D1F]"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {uploading && (
              <span className="flex items-center gap-1.5 rounded-full bg-[#E6FAFF]/60 px-2 py-1 text-[11px] font-medium text-[#008FBF]">
                <span className="relative inline-flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00CCFF] opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00CCFF]" />
                </span>
                Uploading…
              </span>
            )}
          </div>
        )}

        {/* URL field (inline, shown when toggled) */}
        {showUrl && (
          <div className="flex items-center gap-2 rounded-lg border border-[#EAEAEC] bg-[#F9FAFB] px-3 py-2">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-[#00CCFF]" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com  (URL for site analysis)"
              className="flex-1 bg-transparent text-[13px] text-[#1D1D1F] placeholder:text-[#9b9ba3] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                setShowUrl(false);
                setUrl('');
              }}
              aria-label="Clear URL"
              className="flex h-5 w-5 items-center justify-center rounded-full text-[#6E6E73] transition hover:bg-[#F0F0F2] hover:text-[#1D1D1F]"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={1}
              disabled={disabled || voiceActive}
              readOnly={voiceActive}
              className="w-full resize-none bg-transparent px-3 py-2.5 text-[15px] leading-6 text-[#1D1D1F] placeholder:text-[#9b9ba3] focus:outline-none disabled:opacity-50"
            />
            {interimVoice && (
              <div className="pointer-events-none px-3 pb-1 text-[13px] italic leading-5 text-[#00CCFF]">
                {interimVoice}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,.txt,.md,.csv,.json,.docx,.xlsx,.pptx"
              onChange={handleFilePicked}
              className="hidden"
            />
            <IconButton
              title="Attach files"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || files.length >= MAX_FILES}
            >
              <Paperclip className="h-4 w-4" />
            </IconButton>
            <IconButton
              title="Analyse URL"
              onClick={() => setShowUrl((v) => !v)}
              active={showUrl}
            >
              <Link2 className="h-4 w-4" />
            </IconButton>
            {voiceSupported && (
              <IconButton
                title={voiceActive ? 'Stop Voice Forge' : 'Voice Forge (speak)'}
                onClick={toggleVoice}
                active={voiceActive}
              >
                {voiceActive ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </IconButton>
            )}

            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                aria-label="Stop generation"
                className="ml-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1D1D1F] text-white transition hover:bg-[#2a2a30]"
              >
                <Square className="h-4 w-4" fill="currentColor" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSend}
                aria-label="Send message"
                className="ml-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#00CCFF] text-white transition hover:bg-[#00B8E6] disabled:cursor-not-allowed disabled:bg-[#D2D2D7]"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {dragActive && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl border-2 border-dashed border-[#00CCFF] bg-[#E6FAFF]/70 text-xs font-medium text-[#008FBF]">
            Drop images or documents to attach
          </div>
        )}
      </div>

      {uploadError && (
        <div className="mt-2 text-center text-[11px] text-red-600">
          {uploadError}
        </div>
      )}

      <div className="mt-2 text-center text-[11px] text-[#9b9ba3]">
        Valhalla AI can make mistakes. Verify important output. Press{' '}
        <kbd className="rounded border border-[#EAEAEC] bg-[#F5F5F7] px-1 py-0.5 font-mono text-[10px]">
          Enter
        </kbd>{' '}
        to send,{' '}
        <kbd className="rounded border border-[#EAEAEC] bg-[#F5F5F7] px-1 py-0.5 font-mono text-[10px]">
          Shift+Enter
        </kbd>{' '}
        for newline.
      </div>
    </form>
  );
});

interface IconButtonProps {
  title: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

function IconButton({
  title,
  onClick,
  active = false,
  disabled = false,
  children,
}: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={title}
      title={title}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'bg-[#E6FAFF] text-[#008FBF]'
          : 'text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]'
      }`}
    >
      {children}
    </button>
  );
}
