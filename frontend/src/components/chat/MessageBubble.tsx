'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FeedbackControls } from './FeedbackControls';
import { Markdown } from './Markdown';
import { ThinkBlocksPanel } from './ThinkBlocksPanel';
import { extractThink } from './thinkBlocks';
import type { ChatMessage } from './types';

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  userId?: string;
  onFeedback?: (messageId: string, rating: 'like' | 'dislike' | null) => void;
}

export function MessageBubble({
  message,
  isStreaming = false,
  userId,
  onFeedback,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const showFeedback =
    !isUser && !isStreaming && message.content.length > 0 && Boolean(onFeedback);

  // Lift `<think>` blocks out of the assistant content so they
  // render in a dedicated reasoning-trace panel instead of being
  // dumped inline into the bubble.
  const { visible, blocks } = useMemo(
    () => (isUser ? { visible: message.content, blocks: [] } : extractThink(message.content, message.id)),
    [isUser, message.content, message.id],
  );

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
            ? 'max-w-[85%] rounded-2xl bg-[#F4F4F4] px-4 py-3 text-neutral-900 dark:bg-[#2F2F2F] dark:text-neutral-100'
            : 'flex max-w-[92%] flex-col rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] dark:border-neutral-800 dark:bg-[#2A2A2A] dark:text-neutral-100 dark:shadow-none'
        }
      >
        {isUser ? (
          <div className="whitespace-pre-wrap leading-7">{message.content}</div>
        ) : (
          <>
            <ThinkBlocksPanel blocks={blocks} />
            <Markdown content={visible || (isStreaming ? '…' : '')} />
            {isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-[#00CCFF] align-middle" />
            )}
            {showFeedback && userId && onFeedback && (
              <FeedbackControls
                messageId={message.id}
                difyMessageId={message.difyMessageId}
                userId={userId}
                current={message.feedback ?? null}
                onChange={(rating) => onFeedback(message.id, rating)}
              />
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
