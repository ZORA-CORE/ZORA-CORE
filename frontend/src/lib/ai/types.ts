export type AgentId = 'ODIN' | 'THOR' | 'BALDUR' | 'TYR' | 'EIVOR' | 'FREYA' | 'HEIMDALL';

export interface ReasoningStep {
  id: string;
  agent: AgentId;
  thought: string;
  confidence: number;
  timestamp: Date;
  parentId?: string;
}

export interface ToolInvocation {
  id: string;
  agent: AgentId;
  toolName: string;
  input: Record<string, unknown>;
  output?: unknown;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  error?: string;
}

export interface SourceReference {
  id: string;
  type: 'memory' | 'document' | 'api' | 'external';
  title: string;
  url?: string;
  excerpt?: string;
  relevanceScore: number;
  agent: AgentId;
  timestamp: Date;
}

export interface StreamUIState {
  reasoning: ReasoningStep[];
  tools: ToolInvocation[];
  sources: SourceReference[];
  currentAgent: AgentId | null;
  isStreaming: boolean;
}

export interface AIElementProps {
  className?: string;
}

export interface ReasoningProps extends AIElementProps {
  steps: ReasoningStep[];
  isStreaming?: boolean;
}

export interface ToolProps extends AIElementProps {
  invocations: ToolInvocation[];
}

export interface SourcesProps extends AIElementProps {
  sources: SourceReference[];
}

export interface RenderEngineConfig {
  enableStreaming: boolean;
  maxReasoningSteps: number;
  showConfidenceScores: boolean;
  animateTransitions: boolean;
}

export const DEFAULT_RENDER_CONFIG: RenderEngineConfig = {
  enableStreaming: true,
  maxReasoningSteps: 10,
  showConfidenceScores: true,
  animateTransitions: true,
};
