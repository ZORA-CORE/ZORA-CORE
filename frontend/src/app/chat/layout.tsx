import type { ReactNode } from 'react';
import './chat.css';

export default function ChatLayout({ children }: { children: ReactNode }) {
  return <div className="zoracore-chat-root">{children}</div>;
}
