import type { Metadata } from 'next';
import './chat/chat.css';
import { ChatContainer } from '@/components/chat/ChatContainer';

export const metadata: Metadata = {
  title: 'Zoracore — Divine Nordic Intelligence',
  description:
    'A premium, minimalist AI chat interface for Zoracore — the face of our AI software agency.',
};

export default function Home() {
  return (
    <div className="zoracore-chat-root">
      <ChatContainer />
    </div>
  );
}
