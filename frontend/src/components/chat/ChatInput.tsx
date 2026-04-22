'use client';

import { ArrowUp, Square } from 'lucide-react';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';

export interface ChatInputHandle {
  focus: () => void;
  setValue: (value: string) => void;
}

interface ChatInputProps {
  onSubmit: (value: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(function ChatInput(
  {
    onSubmit,
    onStop,
    isStreaming,
    disabled = false,
    placeholder = 'Ask Zoracore to build, architect, or refactor…',
  },
  ref,
) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    setValue: (v: string) => {
      setValue(v);
      // Defer focus until next tick so the new value is visible first.
      requestAnimationFrame(() => textareaRef.current?.focus());
    },
  }));

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled || isStreaming) return;
    onSubmit(trimmed);
    setValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-[800px] px-4 pb-6 pt-2"
    >
      <div className="relative flex items-end gap-2 rounded-2xl border border-[#EAEAEC] bg-white p-2 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] transition focus-within:border-[#00CCFF]/60 focus-within:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,204,255,0.35)]">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] leading-6 text-[#1D1D1F] placeholder:text-[#9b9ba3] focus:outline-none disabled:opacity-50"
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop generation"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1D1D1F] text-white transition hover:bg-[#2a2a30]"
          >
            <Square className="h-4 w-4" fill="currentColor" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!value.trim() || disabled}
            aria-label="Send message"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#00CCFF] text-white transition hover:bg-[#00B8E6] disabled:cursor-not-allowed disabled:bg-[#D2D2D7]"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="mt-2 text-center text-[11px] text-[#9b9ba3]">
        Zoracore can make mistakes. Verify important output. Press{' '}
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
