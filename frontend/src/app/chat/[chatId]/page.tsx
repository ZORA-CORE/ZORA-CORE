import type { Metadata } from 'next';
import { ChatContainer } from '@/components/chat/ChatContainer';

/**
 * Valhalla AI — Singularity Hotfix: per-thread chat route.
 *
 * `/chat/<chatId>` hydrates `ChatContainer` with the thread identified
 * by `chatId`. When the thread exists locally (the common hot-reload
 * case) the sidebar lights up that row and the message list is
 * instantaneous; when it doesn't, `ChatContainer` boots empty and a
 * background fetch against Supabase `valhalla_chat_sessions` +
 * `valhalla_chat_messages` hydrates the React state on mount.
 *
 * Next.js 15 / 16 ships dynamic-route params as a Promise on server
 * components — we await it here and forward the resolved id.
 */
export const metadata: Metadata = {
  title: 'Valhalla AI — Divine Nordic Intelligence',
  description:
    'Forging Future Systems through Divine Intelligence — a premium, multi-agent development environment.',
};

export default async function ChatThreadPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = await params;
  return <ChatContainer initialChatId={chatId} />;
}
