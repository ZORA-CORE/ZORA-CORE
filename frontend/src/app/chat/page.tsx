import type { Metadata } from 'next';
import { ChatContainer } from '@/components/chat/ChatContainer';

export const metadata: Metadata = {
  title: 'Valhalla AI — Divine Nordic Intelligence',
  description:
    'Forging Future Systems through Divine Nordic Intelligence — a premium, multi-agent development environment.',
};

export default function ChatPage() {
  return <ChatContainer />;
}
