import type {
  AgentId,
  ReasoningStep,
  ToolInvocation,
  SourceReference,
  StreamUIState,
  RenderEngineConfig,
} from './types';

export interface StreamableValue<T> {
  value: T;
  update: (newValue: T) => void;
  done: () => void;
}

export interface StreamableUI {
  value: React.ReactNode;
  update: (node: React.ReactNode) => void;
  done: () => void;
}

function createStreamableValue<T>(initialValue: T): StreamableValue<T> {
  let currentValue = initialValue;
  let isDone = false;

  return {
    get value() {
      return currentValue;
    },
    update(newValue: T) {
      if (!isDone) {
        currentValue = newValue;
      }
    },
    done() {
      isDone = true;
    },
  };
}

function createStreamableUI(): StreamableUI {
  let currentNode: React.ReactNode = null;
  let isDone = false;

  return {
    get value() {
      return currentNode;
    },
    update(node: React.ReactNode) {
      if (!isDone) {
        currentNode = node;
      }
    },
    done() {
      isDone = true;
    },
  };
}

export interface StreamUIContext {
  ui: StreamableUI;
  state: StreamableValue<StreamUIState>;
  config: RenderEngineConfig;
}

export async function createStreamUIContext(
  config: Partial<RenderEngineConfig> = {}
): Promise<StreamUIContext> {
  const mergedConfig: RenderEngineConfig = {
    enableStreaming: config.enableStreaming ?? true,
    maxReasoningSteps: config.maxReasoningSteps ?? 10,
    showConfidenceScores: config.showConfidenceScores ?? true,
    animateTransitions: config.animateTransitions ?? true,
  };

  const initialState: StreamUIState = {
    reasoning: [],
    tools: [],
    sources: [],
    currentAgent: null,
    isStreaming: false,
  };

  return {
    ui: createStreamableUI(),
    state: createStreamableValue<StreamUIState>(initialState),
    config: mergedConfig,
  };
}

export async function streamReasoning(
  context: StreamUIContext,
  step: Omit<ReasoningStep, 'id' | 'timestamp'>
): Promise<string> {
  const id = `reasoning-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const fullStep: ReasoningStep = {
    ...step,
    id,
    timestamp: new Date(),
  };

  const currentState = context.state.value;
  const newReasoning = [...currentState.reasoning, fullStep].slice(
    -context.config.maxReasoningSteps
  );

  context.state.update({
    ...currentState,
    reasoning: newReasoning,
    currentAgent: step.agent,
    isStreaming: true,
  });

  return id;
}

export async function streamToolInvocation(
  context: StreamUIContext,
  invocation: Omit<ToolInvocation, 'id' | 'startTime' | 'status'>
): Promise<string> {
  const id = `tool-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const fullInvocation: ToolInvocation = {
    ...invocation,
    id,
    startTime: new Date(),
    status: 'pending',
  };

  const currentState = context.state.value;
  context.state.update({
    ...currentState,
    tools: [...currentState.tools, fullInvocation],
    currentAgent: invocation.agent,
    isStreaming: true,
  });

  return id;
}

export async function updateToolStatus(
  context: StreamUIContext,
  toolId: string,
  status: ToolInvocation['status'],
  output?: unknown,
  error?: string
): Promise<void> {
  const currentState = context.state.value;
  const updatedTools = currentState.tools.map((tool) =>
    tool.id === toolId
      ? {
          ...tool,
          status,
          output,
          error,
          endTime: status === 'completed' || status === 'failed' ? new Date() : undefined,
        }
      : tool
  );

  context.state.update({
    ...currentState,
    tools: updatedTools,
  });
}

export async function streamSource(
  context: StreamUIContext,
  source: Omit<SourceReference, 'id' | 'timestamp'>
): Promise<string> {
  const id = `source-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const fullSource: SourceReference = {
    ...source,
    id,
    timestamp: new Date(),
  };

  const currentState = context.state.value;
  context.state.update({
    ...currentState,
    sources: [...currentState.sources, fullSource],
  });

  return id;
}

export async function completeStream(context: StreamUIContext): Promise<void> {
  const currentState = context.state.value;
  context.state.update({
    ...currentState,
    isStreaming: false,
    currentAgent: null,
  });
  context.state.done();
  context.ui.done();
}

export async function renderAgentResponse(
  agentId: AgentId,
  task: string,
  onStream?: (context: StreamUIContext) => Promise<void>
): Promise<{ ui: React.ReactNode; state: StreamUIState }> {
  const context = await createStreamUIContext();

  await streamReasoning(context, {
    agent: agentId,
    thought: `Analyzing task: ${task}`,
    confidence: 0.9,
  });

  if (onStream) {
    await onStream(context);
  }

  await completeStream(context);

  return {
    ui: context.ui.value,
    state: context.state.value,
  };
}

export {
  type StreamUIState,
  type ReasoningStep,
  type ToolInvocation,
  type SourceReference,
  type AgentId,
};
