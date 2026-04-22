'use client';

import { motion } from 'framer-motion';
import { Markdown } from './Markdown';
import type { ChatMessage } from './types';

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export function MessageBubble({
  message,
  isStreaming = false,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={
          isUser
            ? 'max-w-[85%] rounded-2xl bg-[#F5F5F7] px-4 py-3 text-[#1D1D1F]'
            : 'max-w-[92%] rounded-2xl border border-[#EEF0F2] bg-white px-5 py-4 text-[#1D1D1F] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]'
        }
      >
        {isUser ? (
          <div className="whitespace-pre-wrap leading-7">{message.content}</div>
        ) : (
          <>
            <Markdown content={message.content || (isStreaming ? '…' : '')} />
            {isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-[#00CCFF] align-middle" />
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
