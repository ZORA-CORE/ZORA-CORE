'use server';

/**
 * EIVOR Server Actions
 * Next.js Server Actions for the Episodic Memory System
 * ZORA CORE: Aesir Genesis - Cognitive Sovereignty Level
 */

import {
  initializeEivorMemory,
  storeInitializationMemory,
  computeAllAgentHashes,
  getGlobalMemoryEngine,
  createSICAProtocol,
} from '@/lib/memory';
import type {
  InteractionTrace,
  TraceType,
  AgentId,
  TraceContext,
  TraceAction,
  TraceOutcome,
  MemorySearchQuery,
  MemorySearchResult,
  RetrieveLessonsResult,
  PostMortemInput,
  PostMortemResult,
  ExperienceReplayRequest,
  ExperienceReplayResponse,
  EivorStatus,
} from '@/lib/memory/types';

export async function eivorInitialize(): Promise<{
  success: boolean;
  status: EivorStatus;
  initialization_trace?: InteractionTrace;
  error?: string;
}> {
  try {
    const eivor = await initializeEivorMemory();
    const initTrace = await storeInitializationMemory(eivor.engine);
    const status = await eivor.getStatus();

    return {
      success: true,
      status,
      initialization_trace: initTrace,
    };
  } catch (error) {
    return {
      success: false,
      status: {
        status: 'offline',
        level: 'Cognitive Sovereignty Level',
        memory_stats: {
          hot_memory_count: 0,
          semantic_memory_count: 0,
          total_traces: 0,
          total_lessons: 0,
          total_patterns: 0,
        },
        storage_health: {
          hot_memory: 'offline',
          semantic_memory: 'offline',
        },
        agent_hashes: {} as Record<AgentId, string>,
        reasoning_trace: [],
      },
      error: String(error),
    };
  }
}

export async function eivorEncodeTrajectory(
  traceType: TraceType,
  agentId: AgentId,
  context: TraceContext,
  action: TraceAction,
  outcome: TraceOutcome,
  lessons: string[] = []
): Promise<{
  success: boolean;
  trace?: InteractionTrace;
  error?: string;
}> {
  try {
    const engine = getGlobalMemoryEngine();
    const trace = await engine.encodeTrajectory(
      traceType,
      agentId,
      context,
      action,
      outcome,
      lessons
    );

    return {
      success: true,
      trace,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}

export async function eivorRetrieveLessons(
  currentTask: string,
  agentId?: AgentId
): Promise<{
  success: boolean;
  result?: RetrieveLessonsResult;
  error?: string;
}> {
  try {
    const engine = getGlobalMemoryEngine();
    const result = await engine.retrieveLessons(currentTask, agentId);

    return {
      success: true,
      result,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}

export async function eivorSearch(
  query: MemorySearchQuery
): Promise<{
  success: boolean;
  results?: MemorySearchResult[];
  error?: string;
}> {
  try {
    const engine = getGlobalMemoryEngine();
    const results = await engine.search(query);

    return {
      success: true,
      results,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}

export async function eivorRunPostMortem(
  input: PostMortemInput
): Promise<{
  success: boolean;
  result?: PostMortemResult;
  error?: string;
}> {
  try {
    const engine = getGlobalMemoryEngine();
    const sica = createSICAProtocol(engine);
    const result = await sica.runPostMortem(input);

    return {
      success: true,
      result,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}

export async function eivorExperienceReplay(
  request: ExperienceReplayRequest
): Promise<{
  success: boolean;
  response?: ExperienceReplayResponse;
  error?: string;
}> {
  try {
    const eivor = await initializeEivorMemory();
    const response = await eivor.experienceReplay(request);

    return {
      success: true,
      response,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}

export async function eivorComputeAgentHash(
  agentId: AgentId,
  cognitiveBlueprint: Record<string, unknown>,
  capabilities: string[],
  playbookContent: string
): Promise<{
  success: boolean;
  hash?: string;
  error?: string;
}> {
  try {
    const engine = getGlobalMemoryEngine();
    const hash = await engine.computeAgentMemoryHash(
      agentId,
      cognitiveBlueprint,
      capabilities,
      playbookContent
    );

    return {
      success: true,
      hash,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}

export async function eivorComputeAllAgentHashes(
  agentsJson: {
    agents: Record<AgentId, {
      cognitiveBlueprint: Record<string, unknown>;
      capabilities: string[];
    }>;
  },
  playbooks: Record<AgentId, string>
): Promise<{
  success: boolean;
  hashes?: Record<AgentId, string>;
  error?: string;
}> {
  try {
    const engine = getGlobalMemoryEngine();
    const hashes = await computeAllAgentHashes(engine, agentsJson, playbooks);

    return {
      success: true,
      hashes,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}

export async function eivorGetStatus(): Promise<{
  success: boolean;
  status?: EivorStatus;
  error?: string;
}> {
  try {
    const engine = getGlobalMemoryEngine();
    const status = await engine.getStatus();

    return {
      success: true,
      status,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}

export async function eivorStoreFirstMemory(): Promise<{
  success: boolean;
  trace?: InteractionTrace;
  retrieval_test?: {
    found: boolean;
    trace_id?: string;
  };
  error?: string;
}> {
  try {
    const engine = getGlobalMemoryEngine();
    
    const trace = await engine.encodeTrajectory(
      'initialization',
      'eivor',
      {
        task: 'EIVOR First Memory - Project Initialization',
        task_key: 'first_memory_initialization',
        state: {
          project: 'ZORA CORE',
          codename: 'Aesir Genesis',
          milestone: 'EIVOR Cognitive Sovereignty',
        },
        environment: {
          branch: 'main',
          timestamp: Date.now(),
        },
      },
      {
        type: 'first_memory_storage',
        parameters: {
          memory_type: 'initialization',
          storage_layers: ['hot_memory', 'semantic_memory'],
        },
        reasoning_trace: [
          'Creating first memory for EIVOR system',
          'This memory marks the initialization of the episodic memory system',
          'The Sage of Memory awakens and begins recording',
        ],
      },
      {
        status: 'success',
        score: 1.0,
        artifacts: [
          {
            type: 'file',
            id: 'eivor_memory_engine',
            description: 'EIVOR Memory Engine initialized',
          },
        ],
      },
      [
        'EIVOR Memory System successfully initialized',
        'First memory stored in both hot and semantic layers',
        'The Well of Mímir is now active',
      ]
    );

    const searchResults = await engine.search({
      query: 'EIVOR First Memory initialization',
      topK: 1,
    });

    const found = searchResults.some(r => r.id === trace.id);

    return {
      success: true,
      trace,
      retrieval_test: {
        found,
        trace_id: found ? trace.id : undefined,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}

export async function eivorSimulateOdinQuery(
  taskDescription: string
): Promise<{
  success: boolean;
  odin_received_trace: boolean;
  experience_replay?: ExperienceReplayResponse;
  error?: string;
}> {
  try {
    const eivor = await initializeEivorMemory();
    
    const response = await eivor.experienceReplay({
      requester: 'odin',
      task_description: taskDescription,
      context: {
        query_type: 'experience_replay',
        purpose: 'planning_phase',
        question: 'What have we learned about this pattern before?',
      },
    });

    const odinReceivedTrace = response.historical_traces.length > 0 || 
                              response.relevant_lessons.length > 0;

    return {
      success: true,
      odin_received_trace: odinReceivedTrace,
      experience_replay: response,
    };
  } catch (error) {
    return {
      success: false,
      odin_received_trace: false,
      error: String(error),
    };
  }
}
