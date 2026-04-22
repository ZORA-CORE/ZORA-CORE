import type { Metadata } from 'next';
import { ChatContainer } from '@/components/chat/ChatContainer';

export const metadata: Metadata = {
  title: 'Zoracore — Divine Nordic Intelligence',
  description:
    'A premium, minimalist AI chat interface for Zoracore — the face of our AI software agency.',
};

export default function ChatPage() {
  return <ChatContainer />;
}
