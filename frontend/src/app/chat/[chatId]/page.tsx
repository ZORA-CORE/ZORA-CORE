import type { Metadata } from 'next';
import { ChatContainer } from '@/components/chat/ChatContainer';

export const metadata: Metadata = {
  title: 'Valhalla AI \u2014 Chat',
  description:
    'Forging Future Systems through Divine Nordic Intelligence \u2014 deep-linked chat session.',
};

interface PageProps {
  params: Promise<{ chatId: string }>;
}

/**
 * /chat/[chatId] \u2014 deep-linkable chat session route.
 *
 * Next.js 15 gates `params` behind a Promise. We resolve it in the
 * server component and thread the id down to the client-side
 * ChatContainer, which then hydrates the matching thread from
 * localStorage (or reserves the id for the first `sendMessage`).
 */
export default async function ChatByIdPage({ params }: PageProps) {
  const { chatId } = await params;
  return <ChatContainer initialChatId={chatId} />;
}
