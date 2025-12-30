/**
 * THOR Infrastructure Module - Sovereign Infra Level
 * Main entry point for all THOR infrastructure capabilities
 * ZORA CORE: Aesir Genesis
 */

import { ThorGitHubEngine as _ThorGitHubEngine, createThorGitHubEngine as _createThorGitHubEngine } from './github';
import { VercelDeploymentManager as _VercelDeploymentManager, createVercelManager as _createVercelManager } from './vercel';
import { getDefaultManifest as _getDefaultManifest } from './thor-pipeline';
import type { ManifestConfig } from './types';

export * from './types';

export {
  verify,
  createSystemSnapshot,
  parseManifestYaml,
  Constraints,
  MJOLNIR_VERSION,
  MJOLNIR_CODENAME,
} from './verify';

export type { ConstraintContext, ConstraintResult, Constraint } from './verify';

export {
  runThorPipeline,
  runVerificationOnly,
  getDefaultManifest,
  RSIP_VERSION,
  RSIP_CODENAME,
} from './thor-pipeline';

export {
  ThorGitHubEngine,
  createThorGitHubEngine,
  THOR_GITHUB_VERSION,
} from './github';

export type { GitHubConfig } from './github';

export {
  VercelDeploymentManager,
  GjallarhornCircuitBreaker,
  createVercelManager,
  createGjallarhorn,
  VERCEL_INTEGRATION_VERSION,
  GJALLARHORN_VERSION,
} from './vercel';

export type { VercelConfig, CreateDeploymentOptions } from './vercel';

export interface ThorInfraModule {
  version: string;
  codename: string;
  level: 'Sovereign Infra Level';
  capabilities: {
    formalVerification: boolean;
    recursiveSelfCorrection: boolean;
    atomicCommits: boolean;
    deploymentAutopilot: boolean;
    circuitBreaker: boolean;
  };
}

export const THOR_INFRA: ThorInfraModule = {
  version: '1.0.0',
  codename: 'Mjölnir',
  level: 'Sovereign Infra Level',
  capabilities: {
    formalVerification: true,
    recursiveSelfCorrection: true,
    atomicCommits: true,
    deploymentAutopilot: true,
    circuitBreaker: true,
  },
};

export function initializeThorInfra(config?: {
  githubToken?: string;
  vercelToken?: string;
  owner?: string;
  repo?: string;
}): {
  github: _ThorGitHubEngine;
  vercel: _VercelDeploymentManager;
  manifest: ManifestConfig;
} {
  const github = _createThorGitHubEngine({
    token: config?.githubToken,
    owner: config?.owner || 'ZORA-CORE',
    repo: config?.repo || 'ZORA-CORE',
  });

  const vercel = _createVercelManager({
    token: config?.vercelToken,
  });

  const manifest = _getDefaultManifest();

  return { github, vercel, manifest };
}

export const THOR_INITIALIZATION_MESSAGE = `
╔══════════════════════════════════════════════════════════════╗
║                    THOR SOVEREIGN INFRA                       ║
║                      Level: SOVEREIGN                         ║
╠══════════════════════════════════════════════════════════════╣
║  Mjölnir (Formal Verification Engine)     : ARMED            ║
║  RSIP (Recursive Self-Correction)         : ACTIVE           ║
║  Bifröst (Atomic GitHub Engine)           : CONNECTED        ║
║  Gjallarhorn (Circuit Breaker)            : MONITORING       ║
║  Vercel Autopilot                         : READY            ║
╠══════════════════════════════════════════════════════════════╣
║  The Protector of Infrastructure stands ready.               ║
║  All systems verified. Sovereignty confirmed.                ║
╚══════════════════════════════════════════════════════════════╝
`;
