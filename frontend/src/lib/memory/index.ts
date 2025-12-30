/**
 * EIVOR Memory Module (The Well of Mímir)
 * Main entry point for the Episodic Memory System
 * ZORA CORE: Aesir Genesis - Cognitive Sovereignty Level
 */

export * from './types';
export * from './hot-memory';
export * from './semantic-memory';
export * from './engine';
export * from './sica-protocol';

import { MemoryEngine, createMemoryEngine, getGlobalMemoryEngine } from './engine';
import { SICAProtocol, createSICAProtocol } from './sica-protocol';
import type {
  MemoryEngineConfig,
  EivorStatus,
  AgentId,
  InteractionTrace,
  RetrieveLessonsResult,
  ExperienceReplayRequest,
  ExperienceReplayResponse,
  PostMortemInput,
  PostMortemResult,
} from './types';

export interface EivorMemoryModule {
  version: string;
  codename: string;
  level: string;
  engine: MemoryEngine;
  sica: SICAProtocol;
  
  encodeTrajectory: MemoryEngine['encodeTrajectory'];
  retrieveLessons: MemoryEngine['retrieveLessons'];
  search: MemoryEngine['search'];
  computeAgentMemoryHash: MemoryEngine['computeAgentMemoryHash'];
  getStatus: () => Promise<EivorStatus>;
  
  runPostMortem: (input: PostMortemInput) => Promise<PostMortemResult>;
  experienceReplay: (request: ExperienceReplayRequest) => Promise<ExperienceReplayResponse>;
}

export const EIVOR_MEMORY: {
  version: string;
  codename: string;
  level: string;
} = {
  version: '1.0.0',
  codename: 'Well of Mímir',
  level: 'Cognitive Sovereignty Level',
};

export async function initializeEivorMemory(
  config?: Partial<MemoryEngineConfig>
): Promise<EivorMemoryModule> {
  const engine = config ? createMemoryEngine(config) : getGlobalMemoryEngine();
  const sica = createSICAProtocol(engine);

  const experienceReplay = async (
    request: ExperienceReplayRequest
  ): Promise<ExperienceReplayResponse> => {
    const lessonsResult = await engine.retrieveLessons(
      request.task_description,
      request.requester
    );

    const contextSearch = await engine.search({
      query: JSON.stringify(request.context),
      topK: 5,
      filter: {
        outcome_status: 'success',
      },
    });

    const allTraces = [
      ...lessonsResult.related_traces,
      ...contextSearch.filter(
        r => !lessonsResult.related_traces.some(t => t.id === r.id)
      ),
    ];

    const confidenceScore = calculateConfidence(
      lessonsResult.lessons.length,
      lessonsResult.patterns.length,
      allTraces.length
    );

    return {
      historical_traces: allTraces.slice(0, 10),
      relevant_lessons: lessonsResult.lessons,
      patterns: lessonsResult.patterns,
      recommendations: lessonsResult.recommendations,
      confidence_score: confidenceScore,
      reasoning_trace: lessonsResult.reasoning_trace,
    };
  };

  return {
    version: EIVOR_MEMORY.version,
    codename: EIVOR_MEMORY.codename,
    level: EIVOR_MEMORY.level,
    engine,
    sica,
    
    encodeTrajectory: engine.encodeTrajectory.bind(engine),
    retrieveLessons: engine.retrieveLessons.bind(engine),
    search: engine.search.bind(engine),
    computeAgentMemoryHash: engine.computeAgentMemoryHash.bind(engine),
    getStatus: engine.getStatus.bind(engine),
    
    runPostMortem: sica.runPostMortem.bind(sica),
    experienceReplay,
  };
}

function calculateConfidence(
  lessonCount: number,
  patternCount: number,
  traceCount: number
): number {
  let confidence = 0.3;
  
  confidence += Math.min(0.3, lessonCount * 0.1);
  confidence += Math.min(0.2, patternCount * 0.1);
  confidence += Math.min(0.2, traceCount * 0.02);
  
  return Math.min(1.0, confidence);
}

export async function storeInitializationMemory(
  engine: MemoryEngine
): Promise<InteractionTrace> {
  const trace = await engine.encodeTrajectory(
    'initialization',
    'eivor',
    {
      task: 'ZORA CORE: Aesir Genesis - EIVOR Memory System Initialization',
      task_key: 'eivor_initialization',
      state: {
        version: EIVOR_MEMORY.version,
        codename: EIVOR_MEMORY.codename,
        level: EIVOR_MEMORY.level,
      },
      environment: {
        branch: 'main',
        timestamp: Date.now(),
      },
    },
    {
      type: 'system_initialization',
      parameters: {
        hot_memory: 'enabled',
        semantic_memory: 'pinecone',
        sica_protocol: 'enabled',
      },
      reasoning_trace: [
        'Initializing EIVOR Memory System (Well of Mímir)',
        'Hot Memory layer configured with Vercel KV abstraction',
        'Semantic Memory layer connected to Pinecone vector database',
        'SICA Protocol ready for recursive learning',
        'Experience Replay function available for Odin queries',
      ],
    },
    {
      status: 'success',
      score: 1.0,
      artifacts: [
        {
          type: 'file',
          id: 'memory_engine',
          description: '@/lib/memory/engine.ts',
        },
        {
          type: 'file',
          id: 'sica_protocol',
          description: '@/lib/memory/sica-protocol.ts',
        },
      ],
    },
    [
      'EIVOR Memory System successfully initialized',
      'Dual-layer storage (Hot + Semantic) operational',
      'Ready to serve the Aesir family with episodic memory',
    ]
  );

  return trace;
}

export async function computeAllAgentHashes(
  engine: MemoryEngine,
  agentsJson: {
    agents: Record<AgentId, {
      cognitiveBlueprint: Record<string, unknown>;
      capabilities: string[];
    }>;
  },
  playbooks: Record<AgentId, string>
): Promise<Record<AgentId, string>> {
  const hashes: Record<string, string> = {};
  const agents: AgentId[] = ['odin', 'thor', 'baldur', 'tyr', 'eivor', 'freya', 'heimdall'];

  for (const agentId of agents) {
    const agent = agentsJson.agents[agentId];
    if (agent) {
      const hash = await engine.computeAgentMemoryHash(
        agentId,
        agent.cognitiveBlueprint || {},
        agent.capabilities || [],
        playbooks[agentId] || ''
      );
      hashes[agentId] = hash;
    }
  }

  return hashes as Record<AgentId, string>;
}
