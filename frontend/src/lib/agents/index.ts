/**
 * ZORA CORE: Aesir Genesis - Agent System
 * Multi-agent coordination with Tree-of-Thought reasoning
 * and Agent-to-Agent JSON-RPC communication
 * Phase 3: Asgård Mesh A2A Protocol
 */

export * from './types';
export * from './council';
export * from './a2a';
export * from './mesh';
export * from './raven';
export * from './yggdrasil';
export * from './rsip-engine';
export * from './runtime';

import { AgentCouncil, createAgentCouncil } from './council';
import { A2ACommunicator, createA2ACommunicator } from './a2a';
import { AsgardMesh, createAsgardMesh, getGlobalMesh } from './mesh';
import { RavensMessage, createRavensMessage, getGlobalRaven } from './raven';
import { YggdrasilSync, createYggdrasilSync, getGlobalYggdrasil } from './yggdrasil';
import type { AgentRegistry, OdinOnlineStatus } from './types';

export interface AesirGenesisInstance {
  council: AgentCouncil;
  communicator: A2ACommunicator;
  mesh: AsgardMesh;
  raven: RavensMessage;
  yggdrasil: YggdrasilSync;
  registry: AgentRegistry;
  
  initialize(): Promise<OdinOnlineStatus>;
  getStatus(): AgentRegistry;
  getMeshStatus(): ReturnType<AsgardMesh['getMeshStatus']>;
  getRavenStatus(): ReturnType<RavensMessage['getRavenStatus']>;
  getYggdrasilStatus(): ReturnType<YggdrasilSync['getYggdrasilStatus']>;
  shutdown(): Promise<void>;
}

export function createAesirGenesis(): AesirGenesisInstance {
  const council = createAgentCouncil();
  const communicator = createA2ACommunicator();
  const mesh = createAsgardMesh();
  const raven = createRavensMessage({}, mesh);
  const yggdrasil = createYggdrasilSync({}, mesh);

  const registry: AgentRegistry = {
    version: '1.0.0',
    lastUpdated: Date.now(),
    agents: {
      odin: {
        id: 'odin',
        name: 'ODIN',
        role: 'All-Father Orchestrator',
        domain: 'architecture',
        status: 'initializing',
        lastOnline: 0,
        cognitiveBlueprint: 'Ensemble Reasoning with 4 parallel paths',
        capabilities: ['strategic_planning', 'multi_agent_coordination', 'architectural_decisions'],
        familyBonds: {
          thor: 'son',
          baldur: 'advisor',
          tyr: 'enforcer',
          eivor: 'memory_keeper',
          freya: 'wisdom_seeker',
          heimdall: 'guardian',
        },
      },
      thor: {
        id: 'thor',
        name: 'THOR',
        role: 'Protector of Infrastructure',
        domain: 'infrastructure',
        status: 'initializing',
        lastOnline: 0,
        cognitiveBlueprint: 'Recursive Self-Correction with 3 max attempts',
        capabilities: ['build_management', 'deployment', 'ci_cd', 'error_recovery'],
        familyBonds: {
          odin: 'father',
        },
      },
      baldur: {
        id: 'baldur',
        name: 'BALDUR',
        role: 'Radiant UX/UI',
        domain: 'design',
        status: 'initializing',
        lastOnline: 0,
        cognitiveBlueprint: 'Shadcn MCP Integration for 100% accurate components',
        capabilities: ['component_design', 'accessibility', 'design_system', 'ui_architecture'],
        familyBonds: {
          odin: 'advisor_to',
        },
      },
      tyr: {
        id: 'tyr',
        name: 'TYR',
        role: 'God of Justice',
        domain: 'ethics',
        status: 'initializing',
        lastOnline: 0,
        cognitiveBlueprint: 'Mandatory Validation Loops with 95% confidence threshold',
        capabilities: ['climate_validation', 'greenwashing_detection', 'data_verification', 'ethical_compliance'],
        familyBonds: {
          odin: 'enforcer_for',
        },
      },
      eivor: {
        id: 'eivor',
        name: 'EIVOR',
        role: 'Sage of Memory',
        domain: 'memory',
        status: 'initializing',
        lastOnline: 0,
        cognitiveBlueprint: 'Episodic Memory with memory_hashes in agents.json',
        capabilities: ['memory_storage', 'pattern_recognition', 'knowledge_synthesis', 'learning'],
        familyBonds: {
          odin: 'memory_keeper_for',
        },
      },
      freya: {
        id: 'freya',
        name: 'FREYA',
        role: 'Goddess of Wisdom',
        domain: 'research',
        status: 'initializing',
        lastOnline: 0,
        cognitiveBlueprint: 'Deep Research Protocol with multi-source investigation',
        capabilities: ['research', 'innovation', 'climate_science', 'technology_assessment'],
        familyBonds: {
          odin: 'wisdom_seeker_for',
        },
      },
      heimdall: {
        id: 'heimdall',
        name: 'HEIMDALL',
        role: 'Guardian',
        domain: 'security',
        status: 'initializing',
        lastOnline: 0,
        cognitiveBlueprint: 'Eternal Vigilance Protocol with continuous monitoring',
        capabilities: ['security_monitoring', 'access_control', 'threat_detection', 'audit_logging'],
        familyBonds: {
          odin: 'guardian_for',
        },
      },
    },
    council: {
      activeSessions: 0,
      totalDecisions: 0,
      lastSession: 0,
      consensusRate: 0,
    },
    memory: {
      totalMemories: 0,
      patternsIdentified: 0,
      lessonsSynthesized: 0,
      recentHashes: [],
    },
  };

  return {
    council,
    communicator,
    mesh,
    raven,
    yggdrasil,
    registry,

    async initialize(): Promise<OdinOnlineStatus> {
      for (const agentId of Object.keys(registry.agents) as Array<keyof typeof registry.agents>) {
        registry.agents[agentId].status = 'online';
        registry.agents[agentId].lastOnline = Date.now();
        council.updateAgentStatus(agentId, 'online');
        
        mesh.establishSSEConnection(agentId);
      }

      registry.lastUpdated = Date.now();

      const odinStatus: OdinOnlineStatus = {
        status: 'online',
        ensembleReasoning: 'active',
        parallelPaths: 4,
        judgeMind: 'calibrated',
        familyBonds: 'established',
        climateFilter: 'engaged',
        memoryLink: 'connected',
        message: 'The All-Father watches over Aesir Genesis. Asgård Mesh is active.',
      };

      return odinStatus;
    },

    getStatus(): AgentRegistry {
      return { ...registry };
    },

    getMeshStatus() {
      return mesh.getMeshStatus();
    },

    getRavenStatus() {
      return raven.getRavenStatus();
    },

    getYggdrasilStatus() {
      return yggdrasil.getYggdrasilStatus();
    },

    async shutdown(): Promise<void> {
      yggdrasil.stopAutoSync();
      
      for (const agentId of Object.keys(registry.agents) as Array<keyof typeof registry.agents>) {
        registry.agents[agentId].status = 'offline';
        council.updateAgentStatus(agentId, 'offline');
        mesh.closeSSEConnection(agentId);
      }
      registry.lastUpdated = Date.now();
    },
  };
}

export const AESIR_GENESIS_VERSION = '1.0.0';
export const AESIR_GENESIS_CODENAME = 'Aesir Genesis';
