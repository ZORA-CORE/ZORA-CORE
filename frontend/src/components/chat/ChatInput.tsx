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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceRef = useRef<VoiceSession | null>(null);
  const voiceSupported = useRef<boolean>(false);

  useEffect(() => {
    voiceSupported.current = isVoiceSupported();
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
        const uploaded: AttachedFile[] = [];
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
          uploaded.push({
            clientId: `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: file.name,
            size: file.size,
            mimeType: data.mime_type || file.type || 'application/octet-stream',
            difyId: data.id,
            kind: kindFromMime(data.mime_type || file.type || ''),
          });
        }
        setFiles((prev) => [...prev, ...uploaded]);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : String(err));
      } finally {
        setUploading(false);
      }
    },
    [files.length, userId],
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

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    const trimmedText = value.trim();
    const trimmedUrl = url.trim();
    const hasAttachments = files.length > 0;
    const hasUrl = Boolean(trimmedUrl);
    if (!trimmedText && !hasAttachments && !hasUrl) return;
    if (disabled || isStreaming || uploading) return;

    const composed =
      hasUrl && trimmedText
        ? `[Site analysis: ${trimmedUrl}]\n\n${trimmedText}`
        : hasUrl
          ? `Please analyse this URL: ${trimmedUrl}`
          : trimmedText;

    onSubmit({
      text: composed,
      files,
      url: hasUrl ? trimmedUrl : undefined,
    });

    setValue('');
    setFiles([]);
    setUrl('');
    setShowUrl(false);
    setUploadError(null);
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
                title={`${f.name} · ${Math.round(f.size / 1024)} KB`}
              >
                {f.kind === 'image' ? (
                  <ImageIcon className="h-3.5 w-3.5 text-[#6E6E73]" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-[#6E6E73]" />
                )}
                <span className="max-w-[180px] truncate">{f.name}</span>
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
          <textarea
            ref={textareaRef}
            value={interimVoice ? `${value}${value ? ' ' : ''}${interimVoice}` : value}
            onChange={(e) => {
              setValue(e.target.value);
              if (interimVoice) setInterimVoice('');
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={disabled}
            className="flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] leading-6 text-[#1D1D1F] placeholder:text-[#9b9ba3] focus:outline-none disabled:opacity-50"
          />

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
            {voiceSupported.current && (
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
