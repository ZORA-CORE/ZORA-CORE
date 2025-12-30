/**
 * THOR Infrastructure Types
 * Type definitions for the Formal Verification Engine and Deployment Autopilot
 * ZORA CORE: Aesir Genesis - Sovereign Infra Level
 */

export type InvariantCategory =
  | 'type_safety'
  | 'build_integrity'
  | 'code_quality'
  | 'climate_integrity'
  | 'security'
  | 'agent_integrity'
  | 'git_integrity'
  | 'deployment_safety';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type CheckType =
  | 'typescript_compilation'
  | 'build_command'
  | 'lint_command'
  | 'content_scan'
  | 'secret_scan'
  | 'json_schema'
  | 'commit_verification'
  | 'deployment_gate';

export interface InvariantCheck {
  type: CheckType;
  command?: string;
  config?: Record<string, unknown>;
  expected_exit_code?: number;
  allow_warnings?: boolean;
  allow_errors?: boolean;
  patterns?: string[] | { forbidden?: Array<{ pattern: string; unless_validated?: boolean }> };
  exclude_paths?: string[];
  file?: string;
  required_fields?: string[];
  require_atomic?: boolean;
  require_signed?: boolean;
  require_preview?: boolean;
  preview_health_check?: boolean;
  min_health_score?: number;
}

export interface Invariant {
  id: string;
  name: string;
  description: string;
  category: InvariantCategory;
  severity: Severity;
  check: InvariantCheck;
}

export interface ProofEvidence {
  invariant_id: string;
  passed: boolean;
  evidence_hash: string;
  details: Record<string, unknown>;
  timestamp: number;
}

export interface ProofObject {
  id: string;
  timestamp: number;
  invariants_checked: string[];
  all_passed: boolean;
  evidence: ProofEvidence[];
  proof_hash: string;
  reasoning_trace: string[];
}

export interface VerificationReport {
  manifest_version: string;
  verification_level: string;
  timestamp: number;
  duration_ms: number;
  proof: ProofObject;
  summary: {
    total_invariants: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  failures: Array<{
    invariant_id: string;
    reason: string;
    suggestion?: string;
  }>;
  ready_for_deployment: boolean;
}

export interface ManifestConfig {
  manifest_version: string;
  codename: string;
  verification_level: string;
  invariants: Invariant[];
  proof_requirements: {
    deployment: string[];
    commit: string[];
    climate_claim: string[];
  };
  self_correction_allowlist: Array<{
    category: string;
    actions: string[];
  }>;
  circuit_breaker: CircuitBreakerConfig;
}

export interface CircuitBreakerConfig {
  name: string;
  thresholds: {
    success_rate: number;
    latency_p95_ms: number;
    latency_p99_ms: number;
    error_rate: number;
  };
  probe_config: {
    endpoints: Array<{
      path: string;
      method: string;
      expected_status: number;
    }>;
    probe_count: number;
    probe_interval_ms: number;
  };
  rollback_strategy: string;
}

export interface SystemSnapshot {
  timestamp: number;
  git: {
    branch: string;
    head_oid: string;
    is_clean: boolean;
    modified_files: string[];
  };
  build: {
    last_build_success: boolean;
    last_build_timestamp?: number;
    build_output?: string;
  };
  lint: {
    last_lint_success: boolean;
    error_count: number;
    warning_count: number;
  };
  typescript: {
    strict_mode: boolean;
    compilation_success: boolean;
    error_count: number;
  };
  files: {
    total_count: number;
    typescript_count: number;
    modified_since_last_deploy: string[];
  };
}

export type RSIPState =
  | 'IDLE'
  | 'VERIFY'
  | 'BUILD'
  | 'TEST'
  | 'DEPLOY'
  | 'PROBE'
  | 'ROLLBACK'
  | 'SELF_CORRECT'
  | 'ESCALATE'
  | 'DONE'
  | 'FAILED';

export interface RSIPTransition {
  from: RSIPState;
  to: RSIPState;
  timestamp: number;
  reason: string;
  diagnostics?: Record<string, unknown>;
}

export interface RSIPContext {
  state: RSIPState;
  attempt: number;
  max_attempts: number;
  transitions: RSIPTransition[];
  reasoning_trace: string[];
  diagnostics: {
    exit_codes: number[];
    error_messages: string[];
    matched_patterns: string[];
  };
  proposed_fixes: Array<{
    category: string;
    action: string;
    confidence: number;
    applied: boolean;
    success?: boolean;
  }>;
}

export interface ThorPipelineResult {
  success: boolean;
  final_state: RSIPState;
  context: RSIPContext;
  verification_report?: VerificationReport;
  deployment_info?: DeploymentInfo;
  reasoning_trace: string[];
  duration_ms: number;
}

export interface DeploymentInfo {
  id: string;
  url: string;
  preview_url?: string;
  status: 'pending' | 'building' | 'ready' | 'error' | 'canceled';
  created_at: number;
  ready_at?: number;
  alias?: string[];
}

export interface HealthProbeResult {
  endpoint: string;
  status: number;
  latency_ms: number;
  success: boolean;
  timestamp: number;
}

export interface HealthReport {
  deployment_id: string;
  probes: HealthProbeResult[];
  summary: {
    success_rate: number;
    latency_p95_ms: number;
    latency_p99_ms: number;
    error_rate: number;
  };
  passed_thresholds: boolean;
  timestamp: number;
}

export interface GjallarhornAlert {
  id: string;
  deployment_id: string;
  triggered_at: number;
  reason: string;
  health_report: HealthReport;
  action_taken: 'rollback' | 'alert_only' | 'none';
  rollback_target?: string;
  resolved_at?: number;
}

export interface AtomicCommitRequest {
  branch: string;
  message: {
    headline: string;
    body?: string;
  };
  files: Array<{
    path: string;
    content: string;
    operation: 'add' | 'update' | 'delete';
  }>;
  expected_head_oid: string;
  sign?: boolean;
}

export interface AtomicCommitResult {
  success: boolean;
  commit_oid?: string;
  commit_url?: string;
  verified?: boolean;
  error?: string;
  reasoning_trace: string[];
}

export interface ThorStatus {
  status: 'sovereign' | 'guarding' | 'building' | 'deploying' | 'self_correcting' | 'offline';
  level: 'Sovereign Infra Level';
  current_operation?: string;
  rsip: {
    active: boolean;
    state: RSIPState;
    attempt: number;
    max_attempts: number;
  };
  verification: {
    last_proof_hash?: string;
    last_verification_timestamp?: number;
    invariants_status: 'all_passing' | 'some_failing' | 'unknown';
  };
  deployment: {
    last_deployment_id?: string;
    last_deployment_status?: string;
    gjallarhorn_active: boolean;
  };
  reasoning_trace: string[];
}
