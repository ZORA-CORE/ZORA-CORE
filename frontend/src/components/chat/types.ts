export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
}

export interface AgentPhase {
  id: string;
  label: string;
  icon: string;
}

export const AGENT_PHASES: AgentPhase[] = [
  { id: 'odin', label: 'Odin is architecting…', icon: '◆' },
  { id: 'thor', label: 'Thor is forging backend…', icon: '⚡' },
  { id: 'freja', label: 'Freja is designing UI…', icon: '✦' },
  { id: 'eivor', label: 'Eivor is recalling context…', icon: '◎' },
];
