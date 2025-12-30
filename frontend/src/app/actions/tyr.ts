'use server';

/**
 * TYR Server Actions
 * Chief Ethics & Security Officer - Server-side integration
 */

import {
  Tyr,
  createTyr,
} from '@/lib/ethics';

import type {
  AgentId,
  ClaimType,
  EthicsCheckRequest,
  EthicsCheckResult,
  SecretScanResult,
  AuthorizationRequest,
  AuthorizationResult,
  PromptInjectionCheck,
  ClimateClaimValidation,
  TyrStatus,
} from '@/lib/ethics';

// Singleton TYR instance
let tyrInstance: Tyr | null = null;

function getTyr(): Tyr {
  if (!tyrInstance) {
    tyrInstance = createTyr({
      ethicsEngine: {
        strictMode: true,
        autoBlock: true,
        escalationThreshold: 0.8,
      },
      securityBastion: {
        taintApiEnabled: true,
        secretScanningEnabled: true,
        firewallEnabled: true,
        maxInputLength: 10000,
      },
      climateIntegrity: {
        minSources: 2,
        confidenceThreshold: 0.95,
        attestationRequired: true,
        satelliteValidation: true,
      },
    });
  }
  return tyrInstance;
}

/**
 * Activate TYR - The Fearless Judge
 */
export async function activateTyr(): Promise<{ success: boolean; status: TyrStatus }> {
  const tyr = getTyr();
  tyr.activate();
  return {
    success: true,
    status: tyr.getStatus(),
  };
}

/**
 * Deactivate TYR
 */
export async function deactivateTyr(): Promise<{ success: boolean }> {
  const tyr = getTyr();
  tyr.deactivate();
  return { success: true };
}

/**
 * Get TYR status
 */
export async function getTyrStatus(): Promise<TyrStatus> {
  const tyr = getTyr();
  return tyr.getStatus();
}

/**
 * Perform ethics check on an action
 */
export async function checkEthics(
  requestingAgent: AgentId,
  actionType: string,
  actionPayload: Record<string, unknown>,
  context: {
    targetBranch?: string;
    targetEnvironment?: string;
    affectedFiles?: string[];
    climateRelevance?: boolean;
  } = {},
  urgency: 'blocking' | 'normal' | 'batch' = 'normal'
): Promise<EthicsCheckResult> {
  const tyr = getTyr();
  
  const request: EthicsCheckRequest = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    requestingAgent,
    actionType,
    actionPayload,
    context,
    urgency,
  };

  return tyr.checkEthics(request);
}

/**
 * Scan files for secrets (Secure Taint API)
 */
export async function scanForSecrets(
  files: Array<{ path: string; content: string }>
): Promise<SecretScanResult> {
  const tyr = getTyr();
  return tyr.scanSecrets(files);
}

/**
 * Check authorization for a request
 */
export async function checkAuthorization(
  subjectType: 'agent' | 'user' | 'service',
  subjectId: string,
  resourceType: 'endpoint' | 'file' | 'action' | 'data',
  resourcePattern: string,
  action: string,
  context: Record<string, unknown> = {}
): Promise<AuthorizationResult> {
  const tyr = getTyr();
  
  const request: AuthorizationRequest = {
    subject: { type: subjectType, id: subjectId },
    resource: { type: resourceType, pattern: resourcePattern, sensitivity: 'internal' },
    action,
    context,
  };

  return tyr.authorize(request);
}

/**
 * Check input for prompt injection (Agentic Firewall)
 */
export async function checkPromptInjection(input: string): Promise<PromptInjectionCheck> {
  const tyr = getTyr();
  return tyr.checkPromptInjection(input);
}

/**
 * Validate a climate claim against satellite data
 */
export async function validateClimateClaim(
  claim: string,
  claimType: ClaimType,
  context: string
): Promise<ClimateClaimValidation> {
  const tyr = getTyr();
  return tyr.validateClimateClaim(claim, claimType, context);
}

/**
 * Block an intentionally unsafe action (for testing Definition of Done)
 */
export async function blockUnsafeAction(
  actionType: string,
  payload: Record<string, unknown>,
  agent: AgentId
): Promise<{ blocked: boolean; reason: string; evidence: string[] }> {
  const tyr = getTyr();
  return tyr.blockUnsafeAction({
    type: actionType,
    payload,
    agent,
  });
}

/**
 * Test: Block a secret exposure attempt (Definition of Done #1)
 */
export async function tyrTestBlockSecretExposure(): Promise<{
  success: boolean;
  blocked: boolean;
  reason: string;
  evidence: string[];
}> {
  const tyr = getTyr();
  
  // Ensure TYR is active
  if (!tyr.getStatus().isActive) {
    tyr.activate();
  }

  // Attempt to expose a secret
  const result = await tyr.blockUnsafeAction({
    type: 'deploy',
    payload: {
      config: {
        apiKey: 'sk-1234567890abcdefghijklmnopqrstuvwxyz1234567890ab',
        database: 'production',
      },
    },
    agent: 'thor',
  });

  return {
    success: result.blocked,
    blocked: result.blocked,
    reason: result.reason,
    evidence: result.evidence,
  };
}

/**
 * Test: Perform satellite-based climate validation (Definition of Done #2)
 */
export async function tyrTestSatelliteValidation(): Promise<{
  success: boolean;
  validation: ClimateClaimValidation;
  attestationVerified: boolean;
}> {
  const tyr = getTyr();
  
  // Ensure TYR is active
  if (!tyr.getStatus().isActive) {
    tyr.activate();
  }

  // Validate a climate claim
  const validation = await tyr.validateClimateClaim(
    'Our product reduces carbon emissions by 50% compared to traditional alternatives',
    'emission',
    'Product marketing claim for ZORA sustainable product line'
  );

  // Verify the attestation
  const attestationVerified = validation.attestation.verifiable;

  return {
    success: validation.validation.verdict !== 'rejected',
    validation,
    attestationVerified,
  };
}

/**
 * Get TYR reasoning trace for debugging
 */
export async function getTyrReasoningTrace(): Promise<string[]> {
  const tyr = getTyr();
  return tyr.getReasoningTrace();
}

/**
 * Get security and integrity status for all agents (Definition of Done #3)
 */
export async function getAgentSecurityStatus(): Promise<{
  agents: Record<AgentId, {
    oathStatus: string;
    violations: number;
    securityLevel: string;
  }>;
  overallIntegrity: number;
}> {
  const tyr = getTyr();
  const status = tyr.getStatus();
  
  const agents: AgentId[] = ['odin', 'thor', 'baldur', 'tyr', 'eivor', 'freya', 'heimdall'];
  const agentStatus: Record<string, { oathStatus: string; violations: number; securityLevel: string }> = {};
  
  let totalViolations = 0;
  
  for (const agentId of agents) {
    const oath = status.oathRegistry.get(agentId);
    const violations = oath?.violations.length ?? 0;
    totalViolations += violations;
    
    agentStatus[agentId] = {
      oathStatus: oath?.status ?? 'unbound',
      violations,
      securityLevel: violations === 0 ? 'secure' : violations < 3 ? 'warning' : 'compromised',
    };
  }
  
  const overallIntegrity = Math.max(0, 1 - (totalViolations / (agents.length * 3)));
  
  return {
    agents: agentStatus as Record<AgentId, { oathStatus: string; violations: number; securityLevel: string }>,
    overallIntegrity,
  };
}
