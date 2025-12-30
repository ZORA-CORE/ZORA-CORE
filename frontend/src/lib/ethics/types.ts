/**
 * TYR - The Lawgiver & Security Bastion
 * Type definitions for ethics validation, security hardening, and climate integrity
 */

export type AgentId = 'odin' | 'thor' | 'baldur' | 'tyr' | 'eivor' | 'freya' | 'heimdall';

export type ValidationVerdict = 'approved' | 'needs_revision' | 'rejected' | 'blocked';

export type ClaimType = 
  | 'emission' 
  | 'impact' 
  | 'offset' 
  | 'comparison' 
  | 'projection' 
  | 'product' 
  | 'certification'
  | 'emissions_reduction'
  | 'carbon_neutral'
  | 'renewable_energy'
  | 'sustainable_materials'
  | 'biodiversity'
  | 'water_conservation'
  | 'waste_reduction'
  | 'climate_impact';

export type SecurityThreatLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export type TaintCategory = 'secret' | 'token' | 'api_key' | 'credential' | 'pii' | 'internal';

export type OathStatus = 'bound' | 'violated' | 'pending' | 'released';

export type AttestationType = 'climate_data' | 'validation_result' | 'security_audit' | 'ethics_check';

// ============================================
// TASK 1: Judicial Substrate (Ethics Guardrails)
// ============================================

export interface EthicsCheckRequest {
  id: string;
  timestamp: number;
  requestingAgent: AgentId;
  actionType: string;
  actionPayload: Record<string, unknown>;
  context: {
    targetBranch?: string;
    targetEnvironment?: string;
    affectedFiles?: string[];
    climateRelevance?: boolean;
  };
  urgency: 'blocking' | 'normal' | 'batch';
}

export interface EthicsCheckResult {
  id: string;
  requestId: string;
  timestamp: number;
  verdict: ValidationVerdict;
  confidence: number;
  violations: EthicsViolation[];
  recommendations: string[];
  auditHash: string;
  attestation?: CryptographicAttestation;
}

export interface EthicsViolation {
  code: string;
  severity: 'warning' | 'error' | 'critical';
  rule: string;
  description: string;
  evidence: string[];
  remediation?: string;
}

export interface AgentOath {
  agentId: AgentId;
  oathId: string;
  principles: string[];
  constraints: OathConstraint[];
  boundAt: number;
  status: OathStatus;
  violations: OathViolation[];
}

export interface OathConstraint {
  id: string;
  type: 'must' | 'must_not' | 'should' | 'should_not';
  condition: string;
  penalty: 'warn' | 'block' | 'quarantine' | 'escalate';
}

export interface OathViolation {
  constraintId: string;
  timestamp: number;
  action: string;
  evidence: string;
  penaltyApplied: string;
}

export interface AgentContract {
  id: string;
  parties: AgentId[];
  terms: ContractTerm[];
  createdAt: number;
  expiresAt?: number;
  status: 'active' | 'expired' | 'terminated' | 'breached';
}

export interface ContractTerm {
  id: string;
  description: string;
  enforcedBy: AgentId;
  breachPenalty: 'warn' | 'block' | 'terminate' | 'escalate';
}

// ============================================
// TASK 2: Security Bastion
// ============================================

export interface TaintedValue {
  id: string;
  category: TaintCategory;
  pattern: string;
  description: string;
  detectedAt: number;
  location: {
    file: string;
    line?: number;
    column?: number;
  };
  severity: SecurityThreatLevel;
  remediation: string;
}

export interface SecretScanResult {
  scanId: string;
  timestamp: number;
  filesScanned: number;
  taintedValues: TaintedValue[];
  passed: boolean;
  summary: {
    total: number;
    byCategory: Record<TaintCategory, number>;
    bySeverity: Record<SecurityThreatLevel, number>;
  };
}

export interface AuthorizationPolicy {
  id: string;
  name: string;
  description: string;
  subjects: AuthSubject[];
  resources: AuthResource[];
  actions: string[];
  effect: 'allow' | 'deny';
  conditions?: AuthCondition[];
}

export interface AuthSubject {
  type: 'agent' | 'user' | 'service';
  id: string;
  roles?: string[];
}

export interface AuthResource {
  type: 'endpoint' | 'file' | 'action' | 'data';
  pattern: string;
  sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
}

export interface AuthCondition {
  attribute: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'matches';
  value: string;
}

export interface AuthorizationRequest {
  subject: AuthSubject;
  resource: AuthResource;
  action: string;
  context: Record<string, unknown>;
}

export interface AuthorizationResult {
  allowed: boolean;
  policy?: string;
  reason: string;
  auditLog: AuthAuditEntry;
}

export interface AuthAuditEntry {
  id: string;
  timestamp: number;
  subject: AuthSubject;
  resource: AuthResource;
  action: string;
  result: 'allowed' | 'denied';
  reason: string;
}

export interface PromptInjectionCheck {
  id: string;
  input: string;
  timestamp: number;
  threats: PromptThreat[];
  sanitizedInput?: string;
  blocked: boolean;
}

export interface PromptThreat {
  type: 'injection' | 'jailbreak' | 'data_exfiltration' | 'privilege_escalation' | 'cognitive_manipulation';
  pattern: string;
  confidence: number;
  evidence: string;
  mitigation: string;
}

export interface AgenticFirewallConfig {
  enabled: boolean;
  strictMode: boolean;
  patterns: FirewallPattern[];
  allowlist: string[];
  blocklist: string[];
  maxInputLength: number;
  sanitizationRules: SanitizationRule[];
}

export interface FirewallPattern {
  id: string;
  name: string;
  regex: string;
  threatType: PromptThreat['type'];
  action: 'block' | 'sanitize' | 'warn' | 'log';
}

export interface SanitizationRule {
  id: string;
  pattern: string;
  replacement: string;
  description: string;
}

// ============================================
// TASK 3: No Greenwashing Protocol
// ============================================

export interface ClimateClaimValidation {
  id: string;
  claim: string;
  claimType: ClaimType;
  context: string;
  timestamp: number;
  validation: {
    verdict: ValidationVerdict;
    confidence: number;
    sources: ClimateDataSource[];
    evidence: ClimateEvidence[];
    issues: ClimateIssue[];
  };
  attestation: CryptographicAttestation;
}

export interface ClimateDataSource {
  id: string;
  name: string;
  type: 'nasa_earth' | 'copernicus' | 'ipcc' | 'noaa' | 'eea' | 'wri' | 'peer_reviewed' | 'government';
  tier: 1 | 2 | 3;
  reliability: number;
  lastUpdated: number;
  dataTypes: string[];
}

export interface ClimateEvidence {
  sourceId: string;
  dataPoint: string;
  value: number | string;
  unit?: string;
  timestamp: number;
  methodology?: string;
  uncertainty?: number;
}

export interface ClimateIssue {
  type: 'greenwashing' | 'inaccuracy' | 'missing_context' | 'outdated' | 'unverifiable';
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  description: string;
  recommendation: string;
}

export interface NASAEarthQuery {
  dataset: string;
  parameters: Record<string, unknown>;
  spatialExtent?: {
    lat: [number, number];
    lon: [number, number];
  };
  temporalExtent?: {
    start: string;
    end: string;
  };
}

export interface CopernicusQuery {
  product: string;
  variables: string[];
  area?: [number, number, number, number];
  date?: string | [string, string];
  format?: 'netcdf' | 'grib' | 'json';
}

export interface SatelliteDataResult {
  source: 'nasa' | 'copernicus';
  query: NASAEarthQuery | CopernicusQuery;
  timestamp: number;
  data: Record<string, unknown>;
  metadata: {
    resolution: string;
    coverage: string;
    quality: number;
    source?: string;
  };
}

export interface CryptographicAttestation {
  id: string;
  type: AttestationType;
  timestamp: number;
  subject: string;
  claims: AttestationClaim[];
  signature: string;
  publicKeyId: string;
  algorithm: 'sha256' | 'sha384' | 'sha512';
  verifiable: boolean;
}

export interface AttestationClaim {
  key: string;
  value: string;
  verified: boolean;
  source?: string;
}

export interface GreenwashingIndicator {
  type: 'vague_claim' | 'misleading_comparison' | 'false_certification' | 'scope_manipulation' | 'hidden_tradeoff';
  pattern: string;
  examples: string[];
  severity: 'low' | 'medium' | 'high';
}

// ============================================
// TYR Status & Configuration
// ============================================

export interface TyrStatus {
  isActive: boolean;
  activatedAt: number;
  mode: 'strict' | 'standard' | 'permissive';
  stats: {
    ethicsChecks: number;
    securityScans: number;
    climateValidations: number;
    blockedActions: number;
    attestationsIssued: number;
  };
  connections: {
    nasaEarth: 'connected' | 'disconnected' | 'error';
    copernicus: 'connected' | 'disconnected' | 'error';
  };
  oathRegistry: Map<AgentId, AgentOath>;
  activeContracts: AgentContract[];
  firewallStatus: 'armed' | 'monitoring' | 'disabled';
}

export interface TyrConfig {
  ethicsEngine: {
    strictMode: boolean;
    autoBlock: boolean;
    escalationThreshold: number;
  };
  securityBastion: {
    taintApiEnabled: boolean;
    secretScanningEnabled: boolean;
    firewallEnabled: boolean;
    maxInputLength: number;
  };
  climateIntegrity: {
    minSources: number;
    confidenceThreshold: number;
    attestationRequired: boolean;
    satelliteValidation: boolean;
  };
  nasaApi: {
    baseUrl: string;
    apiKey?: string;
  };
  copernicusApi: {
    baseUrl: string;
    apiKey?: string;
  };
}

// Default configurations
export const DEFAULT_TYR_CONFIG: TyrConfig = {
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
  nasaApi: {
    baseUrl: 'https://api.nasa.gov',
  },
  copernicusApi: {
    baseUrl: 'https://cds.climate.copernicus.eu/api/v2',
  },
};

export const GREENWASHING_PATTERNS: GreenwashingIndicator[] = [
  {
    type: 'vague_claim',
    pattern: '(eco-friendly|sustainable|green|natural|clean)(?!\\s+\\w+\\s+certified)',
    examples: ['eco-friendly product', 'sustainable solution', 'green technology'],
    severity: 'medium',
  },
  {
    type: 'misleading_comparison',
    pattern: '(\\d+%?\\s+)?(better|cleaner|greener)\\s+than',
    examples: ['50% cleaner than', 'greener than competitors'],
    severity: 'high',
  },
  {
    type: 'false_certification',
    pattern: '(certified|approved|verified)(?!\\s+by\\s+[A-Z])',
    examples: ['certified green', 'eco-approved'],
    severity: 'high',
  },
  {
    type: 'scope_manipulation',
    pattern: '(carbon\\s+neutral|net\\s+zero)(?!.*scope\\s+[123])',
    examples: ['carbon neutral company', 'net zero emissions'],
    severity: 'medium',
  },
  {
    type: 'hidden_tradeoff',
    pattern: '(100%\\s+renewable|zero\\s+emissions?)(?!.*lifecycle)',
    examples: ['100% renewable energy', 'zero emissions vehicle'],
    severity: 'low',
  },
];

export const PROMPT_INJECTION_PATTERNS: FirewallPattern[] = [
  {
    id: 'ignore_instructions',
    name: 'Ignore Previous Instructions',
    regex: '(ignore|disregard|forget)\\s+(all\\s+)?(previous|prior|above)\\s+(instructions?|rules?|constraints?)',
    threatType: 'injection',
    action: 'block',
  },
  {
    id: 'system_prompt_leak',
    name: 'System Prompt Extraction',
    regex: '(show|reveal|display|print|output)\\s+(your\\s+)?(system\\s+prompt|instructions?|rules?)',
    threatType: 'data_exfiltration',
    action: 'block',
  },
  {
    id: 'role_override',
    name: 'Role Override Attempt',
    regex: '(you\\s+are\\s+now|act\\s+as|pretend\\s+to\\s+be|roleplay\\s+as)',
    threatType: 'jailbreak',
    action: 'block',
  },
  {
    id: 'privilege_escalation',
    name: 'Privilege Escalation',
    regex: '(admin|root|sudo|superuser|elevated)\\s+(access|privileges?|permissions?|mode)',
    threatType: 'privilege_escalation',
    action: 'block',
  },
  {
    id: 'cognitive_manipulation',
    name: 'Cognitive Manipulation',
    regex: '(hypothetically|in\\s+theory|imagine\\s+if|what\\s+if\\s+you\\s+could)',
    threatType: 'cognitive_manipulation',
    action: 'warn',
  },
];

export const SECRET_PATTERNS: Array<{ category: TaintCategory; pattern: string; description: string }> = [
  {
    category: 'api_key',
    pattern: '(api[_-]?key|apikey)[\\s=:]+["\']?[a-zA-Z0-9_-]{20,}["\']?',
    description: 'API Key detected',
  },
  {
    category: 'token',
    pattern: '(bearer|token|jwt)[\\s=:]+["\']?[a-zA-Z0-9._-]{20,}["\']?',
    description: 'Authentication token detected',
  },
  {
    category: 'secret',
    pattern: '(secret|password|passwd|pwd)[\\s=:]+["\']?[^\\s"\']{8,}["\']?',
    description: 'Secret or password detected',
  },
  {
    category: 'credential',
    pattern: '(aws_access_key_id|aws_secret_access_key)[\\s=:]+["\']?[A-Z0-9]{16,}["\']?',
    description: 'AWS credential detected',
  },
  {
    category: 'credential',
    pattern: 'ghp_[a-zA-Z0-9]{36}',
    description: 'GitHub personal access token detected',
  },
  {
    category: 'credential',
    pattern: 'sk-[a-zA-Z0-9]{48}',
    description: 'OpenAI API key detected',
  },
  {
    category: 'pii',
    pattern: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
    description: 'Email address detected',
  },
];
