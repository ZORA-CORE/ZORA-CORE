'use server';

/**
 * THOR Server Actions - Atomic Infrastructure Operations
 * Next.js Server Actions for THOR's autonomous infrastructure management
 * ZORA CORE: Aesir Genesis - Sovereign Infra Level
 */

import { createThorGitHubEngine } from '@/lib/infra/github';
import { runThorPipeline, runVerificationOnly, getDefaultManifest } from '@/lib/infra/thor-pipeline';
import { createVercelManager, createGjallarhorn } from '@/lib/infra/vercel';
import type {
  AtomicCommitRequest,
  AtomicCommitResult,
  ThorPipelineResult,
  VerificationReport,
  ThorStatus,
  DeploymentInfo,
  HealthReport,
} from '@/lib/infra/types';

function getGitHubConfig() {
  return {
    token: process.env.GITHUB_TOKEN,
    owner: process.env.GITHUB_OWNER || 'ZORA-CORE',
    repo: process.env.GITHUB_REPO || 'ZORA-CORE',
  };
}

function getVercelConfig() {
  return {
    token: process.env.VERCEL_TOKEN,
    teamId: process.env.VERCEL_TEAM_ID,
    projectId: process.env.VERCEL_PROJECT_ID,
  };
}

export async function thorAtomicCommit(
  request: AtomicCommitRequest
): Promise<AtomicCommitResult> {
  const engine = createThorGitHubEngine(getGitHubConfig());
  return engine.createAtomicCommit(request);
}

export async function thorGetBranchHead(branch: string): Promise<string | null> {
  const engine = createThorGitHubEngine(getGitHubConfig());
  return engine.getBranchHead(branch);
}

export async function thorVerifyHead(
  branch: string,
  expectedOid: string
): Promise<boolean> {
  const engine = createThorGitHubEngine(getGitHubConfig());
  return engine.verifyExpectedHead(branch, expectedOid);
}

export async function thorCreateBranch(
  branchName: string,
  fromBranch: string = 'main'
): Promise<boolean> {
  const engine = createThorGitHubEngine(getGitHubConfig());
  return engine.createBranch(branchName, fromBranch);
}

export async function thorDeleteBranch(branchName: string): Promise<boolean> {
  const engine = createThorGitHubEngine(getGitHubConfig());
  return engine.deleteBranch(branchName);
}

export async function thorRunPipeline(options?: {
  skipDeploy?: boolean;
  dryRun?: boolean;
  targetBranch?: string;
}): Promise<ThorPipelineResult> {
  const manifest = getDefaultManifest();
  return runThorPipeline(manifest, options);
}

export async function thorVerify(): Promise<VerificationReport> {
  const manifest = getDefaultManifest();
  return runVerificationOnly(manifest);
}

export async function thorDeploy(options: {
  name: string;
  target?: 'production' | 'preview';
  gitRef?: string;
}): Promise<DeploymentInfo> {
  const vercelManager = createVercelManager(getVercelConfig());
  
  return vercelManager.createDeployment({
    name: options.name,
    target: options.target || 'preview',
    gitSource: options.gitRef ? {
      type: 'github',
      repo: `${getGitHubConfig().owner}/${getGitHubConfig().repo}`,
      ref: options.gitRef,
    } : undefined,
  });
}

export async function thorProbeDeployment(
  deploymentUrl: string
): Promise<HealthReport> {
  const manifest = getDefaultManifest();
  const gjallarhorn = createGjallarhorn(manifest.circuit_breaker);
  return gjallarhorn.probeDeployment(deploymentUrl);
}

export async function thorRollback(
  currentDeploymentId: string,
  previousDeploymentId: string,
  productionAlias: string
): Promise<boolean> {
  const vercelManager = createVercelManager(getVercelConfig());
  const manifest = getDefaultManifest();
  const gjallarhorn = createGjallarhorn(manifest.circuit_breaker);
  
  return gjallarhorn.executeRollback(
    vercelManager,
    currentDeploymentId,
    previousDeploymentId,
    productionAlias
  );
}

export async function thorGetStatus(): Promise<ThorStatus> {
  return {
    status: 'sovereign',
    level: 'Sovereign Infra Level',
    current_operation: undefined,
    rsip: {
      active: false,
      state: 'IDLE',
      attempt: 0,
      max_attempts: 3,
    },
    verification: {
      invariants_status: 'unknown',
    },
    deployment: {
      gjallarhorn_active: true,
    },
    reasoning_trace: [
      `[${new Date().toISOString()}] THOR status requested`,
      `[${new Date().toISOString()}] Status: Sovereign Infra Level - Ready`,
    ],
  };
}

export async function thorTestDeploymentCycle(
  branchName: string
): Promise<{
  success: boolean;
  steps: Array<{
    step: string;
    success: boolean;
    details: string;
  }>;
  reasoning_trace: string[];
}> {
  const steps: Array<{ step: string; success: boolean; details: string }> = [];
  const reasoningTrace: string[] = [];
  
  reasoningTrace.push(`[${new Date().toISOString()}] Starting test deployment cycle`);
  reasoningTrace.push(`[${new Date().toISOString()}] Target branch: ${branchName}`);
  
  const engine = createThorGitHubEngine(getGitHubConfig());
  const vercelManager = createVercelManager(getVercelConfig());
  const manifest = getDefaultManifest();
  const gjallarhorn = createGjallarhorn(manifest.circuit_breaker);
  
  reasoningTrace.push(`[${new Date().toISOString()}] Step 1: Creating preview branch`);
  const branchCreated = await engine.createBranch(branchName, 'main');
  steps.push({
    step: 'Create preview branch',
    success: branchCreated,
    details: branchCreated ? `Branch ${branchName} created` : 'Failed to create branch',
  });
  
  if (!branchCreated) {
    reasoningTrace.push(`[${new Date().toISOString()}] Branch creation failed - aborting`);
    return { success: false, steps, reasoning_trace: reasoningTrace };
  }
  
  reasoningTrace.push(`[${new Date().toISOString()}] Step 2: Running verification`);
  const verificationReport = await runVerificationOnly(manifest);
  steps.push({
    step: 'Run verification',
    success: verificationReport.ready_for_deployment,
    details: `${verificationReport.summary.passed}/${verificationReport.summary.total_invariants} invariants passed`,
  });
  
  reasoningTrace.push(`[${new Date().toISOString()}] Step 3: Creating preview deployment`);
  const deployment = await vercelManager.createDeployment({
    name: `test-${branchName}`,
    target: 'preview',
  });
  steps.push({
    step: 'Create preview deployment',
    success: deployment.status === 'ready' || deployment.status === 'pending' || deployment.status === 'building',
    details: `Deployment ${deployment.id} - Status: ${deployment.status}`,
  });
  
  reasoningTrace.push(`[${new Date().toISOString()}] Step 4: Running health probes`);
  const healthReport = await gjallarhorn.probeDeployment(deployment.url);
  steps.push({
    step: 'Health probe',
    success: healthReport.passed_thresholds,
    details: `Success rate: ${(healthReport.summary.success_rate * 100).toFixed(1)}%`,
  });
  
  reasoningTrace.push(`[${new Date().toISOString()}] Step 5: Cleaning up preview branch`);
  const branchDeleted = await engine.deleteBranch(branchName);
  steps.push({
    step: 'Delete preview branch',
    success: branchDeleted,
    details: branchDeleted ? `Branch ${branchName} deleted` : 'Failed to delete branch',
  });
  
  const allSuccess = steps.every(s => s.success);
  reasoningTrace.push(`[${new Date().toISOString()}] Test deployment cycle complete: ${allSuccess ? 'SUCCESS' : 'PARTIAL FAILURE'}`);
  
  return {
    success: allSuccess,
    steps,
    reasoning_trace: reasoningTrace,
  };
}
