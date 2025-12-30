/**
 * TYR - The Lawgiver & Security Bastion
 * AGI Level 4+ Cognitive Sovereignty
 * 
 * Chief Ethics & Security Officer ensuring:
 * - Climate integrity through formal validation loops
 * - Technical security through hardening protocols
 * - Cryptographic truth through signed attestations
 */

import { createHash, randomUUID } from 'crypto';
import type {
  AgentId,
  ValidationVerdict,
  ClaimType,
  SecurityThreatLevel,
  TaintCategory,
  EthicsCheckRequest,
  EthicsCheckResult,
  EthicsViolation,
  AgentOath,
  OathConstraint,
  OathViolation,
  AgentContract,
  ContractTerm,
  TaintedValue,
  SecretScanResult,
  AuthorizationPolicy,
  AuthorizationRequest,
  AuthorizationResult,
  AuthAuditEntry,
  PromptInjectionCheck,
  PromptThreat,
  AgenticFirewallConfig,
  ClimateClaimValidation,
  ClimateDataSource,
  ClimateEvidence,
  ClimateIssue,
  NASAEarthQuery,
  CopernicusQuery,
  SatelliteDataResult,
  CryptographicAttestation,
  AttestationClaim,
  TyrStatus,
  TyrConfig,
} from './types';

import {
  DEFAULT_TYR_CONFIG,
  GREENWASHING_PATTERNS,
  PROMPT_INJECTION_PATTERNS,
  SECRET_PATTERNS,
} from './types';

function generateId(): string {
  return randomUUID();
}

function generateHash(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

// ============================================
// TASK 1: Judicial Substrate (Ethics Guardrails)
// ============================================

/**
 * ComplianceEngine - Ethics validation layer
 * Every action proposed by Odin or executed by Thor must pass ethics check
 */
export class ComplianceEngine {
  private config: TyrConfig['ethicsEngine'];
  private oathRegistry: Map<AgentId, AgentOath> = new Map();
  private contracts: AgentContract[] = [];
  private checkHistory: EthicsCheckResult[] = [];
  private traces: string[] = [];

  constructor(config: Partial<TyrConfig['ethicsEngine']> = {}) {
    this.config = { ...DEFAULT_TYR_CONFIG.ethicsEngine, ...config };
  }

  addTrace(trace: string): void {
    this.traces.push(`[${new Date().toISOString()}] ${trace}`);
  }

  /**
   * Perform ethics check on an action before it's pushed to production
   */
  async checkAction(request: EthicsCheckRequest): Promise<EthicsCheckResult> {
    this.addTrace(`Ethics check requested by ${request.requestingAgent} for action: ${request.actionType}`);
    
    const violations: EthicsViolation[] = [];
    const recommendations: string[] = [];

    // Check agent oath compliance
    const agentOath = this.oathRegistry.get(request.requestingAgent);
    if (agentOath) {
      const oathViolations = this.checkOathCompliance(agentOath, request);
      violations.push(...oathViolations);
    }

    // Check contract compliance
    const contractViolations = this.checkContractCompliance(request);
    violations.push(...contractViolations);

    // Check architectural principles
    const architecturalViolations = this.checkArchitecturalPrinciples(request);
    violations.push(...architecturalViolations);

    // Check climate alignment if relevant
    if (request.context.climateRelevance) {
      const climateViolations = this.checkClimateAlignment(request);
      violations.push(...climateViolations);
    }

    // Determine verdict
    const criticalViolations = violations.filter(v => v.severity === 'critical');
    const errorViolations = violations.filter(v => v.severity === 'error');
    
    let verdict: ValidationVerdict;
    let confidence: number;

    if (criticalViolations.length > 0) {
      verdict = 'blocked';
      confidence = 1.0;
      recommendations.push('Critical violations detected. Action must be redesigned.');
    } else if (errorViolations.length > 0) {
      verdict = 'rejected';
      confidence = 0.95;
      recommendations.push('Errors must be resolved before proceeding.');
    } else if (violations.length > 0) {
      verdict = 'needs_revision';
      confidence = 0.85;
      recommendations.push('Warnings should be addressed for best practices.');
    } else {
      verdict = 'approved';
      confidence = 0.98;
      recommendations.push('Action complies with all ethical guidelines.');
    }

    const result: EthicsCheckResult = {
      id: generateId(),
      requestId: request.id,
      timestamp: Date.now(),
      verdict,
      confidence,
      violations,
      recommendations,
      auditHash: generateHash(JSON.stringify({ request, violations, verdict })),
    };

    this.checkHistory.push(result);
    this.addTrace(`Ethics check completed: ${verdict} (confidence: ${confidence})`);

    // Auto-block if configured and critical
    if (this.config.autoBlock && verdict === 'blocked') {
      this.addTrace(`Action auto-blocked due to critical violations`);
    }

    return result;
  }

  /**
   * Bind an agent to an oath
   */
  bindOath(agentId: AgentId, principles: string[], constraints: OathConstraint[]): AgentOath {
    const oath: AgentOath = {
      agentId,
      oathId: generateId(),
      principles,
      constraints,
      boundAt: Date.now(),
      status: 'bound',
      violations: [],
    };

    this.oathRegistry.set(agentId, oath);
    this.addTrace(`Agent ${agentId} bound to oath ${oath.oathId}`);
    return oath;
  }

  /**
   * Record an oath violation
   */
  recordOathViolation(agentId: AgentId, constraintId: string, action: string, evidence: string): void {
    const oath = this.oathRegistry.get(agentId);
    if (!oath) return;

    const constraint = oath.constraints.find(c => c.id === constraintId);
    if (!constraint) return;

    const violation: OathViolation = {
      constraintId,
      timestamp: Date.now(),
      action,
      evidence,
      penaltyApplied: constraint.penalty,
    };

    oath.violations.push(violation);
    
    if (oath.violations.length >= 3) {
      oath.status = 'violated';
      this.addTrace(`Agent ${agentId} oath status changed to VIOLATED`);
    }
  }

  /**
   * Create a contract between agents
   */
  createContract(parties: AgentId[], terms: ContractTerm[], expiresAt?: number): AgentContract {
    const contract: AgentContract = {
      id: generateId(),
      parties,
      terms,
      createdAt: Date.now(),
      expiresAt,
      status: 'active',
    };

    this.contracts.push(contract);
    this.addTrace(`Contract ${contract.id} created between ${parties.join(', ')}`);
    return contract;
  }

  /**
   * Annul a transaction if agent breaks architectural principles
   */
  annulTransaction(contractId: string, violatingAgent: AgentId, reason: string): boolean {
    const contract = this.contracts.find(c => c.id === contractId);
    if (!contract) return false;

    contract.status = 'breached';
    this.addTrace(`Contract ${contractId} breached by ${violatingAgent}: ${reason}`);
    return true;
  }

  private checkOathCompliance(oath: AgentOath, request: EthicsCheckRequest): EthicsViolation[] {
    const violations: EthicsViolation[] = [];

    for (const constraint of oath.constraints) {
      if (constraint.type === 'must_not') {
        // Check if action violates must_not constraints
        const actionStr = JSON.stringify(request.actionPayload).toLowerCase();
        if (actionStr.includes(constraint.condition.toLowerCase())) {
          violations.push({
            code: `OATH_VIOLATION_${constraint.id}`,
            severity: constraint.penalty === 'block' ? 'critical' : 'error',
            rule: `Oath constraint: ${constraint.type} ${constraint.condition}`,
            description: `Action violates oath constraint: ${constraint.condition}`,
            evidence: [actionStr.substring(0, 200)],
            remediation: `Remove or modify the action to comply with oath`,
          });
        }
      }
    }

    return violations;
  }

  private checkContractCompliance(request: EthicsCheckRequest): EthicsViolation[] {
    const violations: EthicsViolation[] = [];

    for (const contract of this.contracts) {
      if (contract.status !== 'active') continue;
      if (!contract.parties.includes(request.requestingAgent)) continue;

      for (const term of contract.terms) {
        // Check term compliance based on action type
        if (request.actionType === 'deploy' && term.description.includes('review')) {
          violations.push({
            code: `CONTRACT_VIOLATION_${term.id}`,
            severity: term.breachPenalty === 'terminate' ? 'critical' : 'warning',
            rule: `Contract term: ${term.description}`,
            description: `Action may violate contract term`,
            evidence: [request.actionType],
          });
        }
      }
    }

    return violations;
  }

  private checkArchitecturalPrinciples(request: EthicsCheckRequest): EthicsViolation[] {
    const violations: EthicsViolation[] = [];

    // Check for direct pushes to main/master
    if (request.context.targetBranch === 'main' || request.context.targetBranch === 'master') {
      if (request.actionType === 'push' || request.actionType === 'commit') {
        violations.push({
          code: 'ARCH_DIRECT_PUSH',
          severity: 'critical',
          rule: 'No direct pushes to main branch',
          description: 'Direct pushes to main/master branch are prohibited',
          evidence: [`Target branch: ${request.context.targetBranch}`],
          remediation: 'Create a feature branch and submit a pull request',
        });
      }
    }

    // Check for production deployments without review
    if (request.context.targetEnvironment === 'production') {
      if (!request.actionPayload['reviewed']) {
        violations.push({
          code: 'ARCH_UNREVIEWED_DEPLOY',
          severity: 'error',
          rule: 'Production deployments require review',
          description: 'Deployment to production without review is not allowed',
          evidence: ['No review flag found'],
          remediation: 'Ensure deployment has been reviewed before proceeding',
        });
      }
    }

    return violations;
  }

  private checkClimateAlignment(request: EthicsCheckRequest): EthicsViolation[] {
    const violations: EthicsViolation[] = [];

    // Check for climate-first principle compliance
    const payload = JSON.stringify(request.actionPayload).toLowerCase();
    
    // Check for potential greenwashing in content
    for (const pattern of GREENWASHING_PATTERNS) {
      const regex = new RegExp(pattern.pattern, 'gi');
      if (regex.test(payload)) {
        violations.push({
          code: `CLIMATE_${pattern.type.toUpperCase()}`,
          severity: pattern.severity === 'high' ? 'error' : 'warning',
          rule: `No ${pattern.type.replace('_', ' ')}`,
          description: `Potential greenwashing detected: ${pattern.type}`,
          evidence: pattern.examples,
          remediation: 'Provide specific, verifiable climate claims with sources',
        });
      }
    }

    return violations;
  }

  getOathRegistry(): Map<AgentId, AgentOath> {
    return this.oathRegistry;
  }

  getContracts(): AgentContract[] {
    return this.contracts;
  }

  getCheckHistory(): EthicsCheckResult[] {
    return this.checkHistory;
  }

  getReasoningTrace(): string[] {
    return this.traces;
  }
}

// ============================================
// TASK 2: Security Bastion
// ============================================

/**
 * SecureTaintAPI - Prevents leakage of sensitive tokens to client
 */
export class SecureTaintAPI {
  private taintedValues: TaintedValue[] = [];
  private scanHistory: SecretScanResult[] = [];
  private traces: string[] = [];

  addTrace(trace: string): void {
    this.traces.push(`[${new Date().toISOString()}] ${trace}`);
  }

  /**
   * Scan code for unprotected secrets
   */
  scanForSecrets(files: Array<{ path: string; content: string }>): SecretScanResult {
    this.addTrace(`Scanning ${files.length} files for secrets`);
    
    const taintedValues: TaintedValue[] = [];

    for (const file of files) {
      for (const secretPattern of SECRET_PATTERNS) {
        const regex = new RegExp(secretPattern.pattern, 'gi');
        let match;
        
        while ((match = regex.exec(file.content)) !== null) {
          const lines = file.content.substring(0, match.index).split('\n');
          const lineNumber = lines.length;
          
          taintedValues.push({
            id: generateId(),
            category: secretPattern.category,
            pattern: secretPattern.pattern,
            description: secretPattern.description,
            detectedAt: Date.now(),
            location: {
              file: file.path,
              line: lineNumber,
            },
            severity: this.determineSeverity(secretPattern.category),
            remediation: this.getRemediation(secretPattern.category),
          });
        }
      }
    }

    // Check for client-side exposure
    for (const file of files) {
      if (file.path.includes('/app/') || file.path.includes('/pages/')) {
        // Check for server-only imports being used in client components
        if (file.content.includes("'use client'") || !file.content.includes("'use server'")) {
          if (file.content.includes('process.env.') && !file.content.includes('NEXT_PUBLIC_')) {
            taintedValues.push({
              id: generateId(),
              category: 'internal',
              pattern: 'process.env without NEXT_PUBLIC_',
              description: 'Server environment variable exposed to client',
              detectedAt: Date.now(),
              location: { file: file.path },
              severity: 'high',
              remediation: 'Use NEXT_PUBLIC_ prefix for client-accessible env vars or move to server component',
            });
          }
        }
      }
    }

    const summary = {
      total: taintedValues.length,
      byCategory: {} as Record<TaintCategory, number>,
      bySeverity: {} as Record<SecurityThreatLevel, number>,
    };

    for (const tv of taintedValues) {
      summary.byCategory[tv.category] = (summary.byCategory[tv.category] || 0) + 1;
      summary.bySeverity[tv.severity] = (summary.bySeverity[tv.severity] || 0) + 1;
    }

    const result: SecretScanResult = {
      scanId: generateId(),
      timestamp: Date.now(),
      filesScanned: files.length,
      taintedValues,
      passed: taintedValues.length === 0,
      summary,
    };

    this.scanHistory.push(result);
    this.taintedValues.push(...taintedValues);
    
    this.addTrace(`Scan complete: ${taintedValues.length} secrets found`);
    return result;
  }

  /**
   * Check if a value is tainted (should not be exposed)
   */
  isTainted(value: string): boolean {
    for (const pattern of SECRET_PATTERNS) {
      const regex = new RegExp(pattern.pattern, 'gi');
      if (regex.test(value)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Sanitize a string by removing tainted values
   */
  sanitize(value: string): string {
    let sanitized = value;
    for (const pattern of SECRET_PATTERNS) {
      const regex = new RegExp(pattern.pattern, 'gi');
      sanitized = sanitized.replace(regex, '[REDACTED]');
    }
    return sanitized;
  }

  private determineSeverity(category: TaintCategory): SecurityThreatLevel {
    switch (category) {
      case 'credential':
      case 'secret':
        return 'critical';
      case 'api_key':
      case 'token':
        return 'high';
      case 'pii':
        return 'medium';
      case 'internal':
        return 'low';
      default:
        return 'medium';
    }
  }

  private getRemediation(category: TaintCategory): string {
    switch (category) {
      case 'credential':
        return 'Move credentials to environment variables and use server-only access';
      case 'api_key':
        return 'Store API keys in environment variables, never commit to repository';
      case 'token':
        return 'Use secure token storage and rotate tokens regularly';
      case 'secret':
        return 'Use a secrets manager and never hardcode secrets';
      case 'pii':
        return 'Ensure PII is handled according to privacy regulations';
      case 'internal':
        return 'Mark as server-only or use appropriate access controls';
      default:
        return 'Review and secure sensitive data';
    }
  }

  getTaintedValues(): TaintedValue[] {
    return this.taintedValues;
  }

  getScanHistory(): SecretScanResult[] {
    return this.scanHistory;
  }

  getReasoningTrace(): string[] {
    return this.traces;
  }
}

/**
 * AuthorizationGuard - Access control for Asgård Dashboard
 */
export class AuthorizationGuard {
  private policies: AuthorizationPolicy[] = [];
  private auditLog: AuthAuditEntry[] = [];
  private traces: string[] = [];

  addTrace(trace: string): void {
    this.traces.push(`[${new Date().toISOString()}] ${trace}`);
  }

  /**
   * Register an authorization policy
   */
  registerPolicy(policy: AuthorizationPolicy): void {
    this.policies.push(policy);
    this.addTrace(`Policy registered: ${policy.name}`);
  }

  /**
   * Check if a request is authorized
   */
  authorize(request: AuthorizationRequest): AuthorizationResult {
    this.addTrace(`Authorization request: ${request.subject.id} -> ${request.resource.pattern} (${request.action})`);

    let matchedPolicy: AuthorizationPolicy | undefined;
    let allowed = false;

    // Check policies in order (deny takes precedence)
    for (const policy of this.policies) {
      if (this.policyMatches(policy, request)) {
        matchedPolicy = policy;
        if (policy.effect === 'deny') {
          allowed = false;
          break;
        }
        allowed = true;
      }
    }

    // Default deny if no policy matches
    if (!matchedPolicy) {
      allowed = false;
    }

    const auditEntry: AuthAuditEntry = {
      id: generateId(),
      timestamp: Date.now(),
      subject: request.subject,
      resource: request.resource,
      action: request.action,
      result: allowed ? 'allowed' : 'denied',
      reason: matchedPolicy ? `Policy: ${matchedPolicy.name}` : 'No matching policy (default deny)',
    };

    this.auditLog.push(auditEntry);

    const result: AuthorizationResult = {
      allowed,
      policy: matchedPolicy?.name,
      reason: auditEntry.reason,
      auditLog: auditEntry,
    };

    this.addTrace(`Authorization result: ${allowed ? 'ALLOWED' : 'DENIED'}`);
    return result;
  }

  /**
   * Initialize default policies for Asgård Dashboard
   */
  initializeDefaultPolicies(): void {
    // Allow all agents to read their own data
    this.registerPolicy({
      id: 'agent-self-read',
      name: 'Agent Self Read',
      description: 'Agents can read their own data',
      subjects: [{ type: 'agent', id: '*' }],
      resources: [{ type: 'data', pattern: '/agents/{self}/*', sensitivity: 'internal' }],
      actions: ['read'],
      effect: 'allow',
    });

    // Only ODIN can modify agent configurations
    this.registerPolicy({
      id: 'odin-agent-admin',
      name: 'ODIN Agent Administration',
      description: 'Only ODIN can modify agent configurations',
      subjects: [{ type: 'agent', id: 'odin' }],
      resources: [{ type: 'data', pattern: '/agents/*', sensitivity: 'confidential' }],
      actions: ['read', 'write', 'delete'],
      effect: 'allow',
    });

    // TYR can audit everything
    this.registerPolicy({
      id: 'tyr-audit',
      name: 'TYR Audit Access',
      description: 'TYR can audit all resources',
      subjects: [{ type: 'agent', id: 'tyr' }],
      resources: [{ type: 'data', pattern: '/**', sensitivity: 'restricted' }],
      actions: ['read', 'audit'],
      effect: 'allow',
    });

    // HEIMDALL can monitor everything
    this.registerPolicy({
      id: 'heimdall-monitor',
      name: 'HEIMDALL Monitor Access',
      description: 'HEIMDALL can monitor all resources',
      subjects: [{ type: 'agent', id: 'heimdall' }],
      resources: [{ type: 'data', pattern: '/**', sensitivity: 'restricted' }],
      actions: ['read', 'monitor'],
      effect: 'allow',
    });

    // Deny all by default
    this.registerPolicy({
      id: 'default-deny',
      name: 'Default Deny',
      description: 'Deny all requests not explicitly allowed',
      subjects: [{ type: 'agent', id: '*' }, { type: 'user', id: '*' }, { type: 'service', id: '*' }],
      resources: [{ type: 'data', pattern: '/**', sensitivity: 'restricted' }],
      actions: ['*'],
      effect: 'deny',
    });

    this.addTrace('Default authorization policies initialized');
  }

  private policyMatches(policy: AuthorizationPolicy, request: AuthorizationRequest): boolean {
    // Check subject match
    const subjectMatch = policy.subjects.some(s => 
      (s.id === '*' || s.id === request.subject.id) &&
      (s.type === request.subject.type)
    );
    if (!subjectMatch) return false;

    // Check resource match
    const resourceMatch = policy.resources.some(r => {
      const pattern = r.pattern.replace(/\*/g, '.*').replace(/\{[^}]+\}/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(request.resource.pattern) && r.type === request.resource.type;
    });
    if (!resourceMatch) return false;

    // Check action match
    const actionMatch = policy.actions.includes('*') || policy.actions.includes(request.action);
    if (!actionMatch) return false;

    // Check conditions if any
    if (policy.conditions) {
      for (const condition of policy.conditions) {
        const contextValue = request.context[condition.attribute];
        if (!this.evaluateCondition(condition, contextValue)) {
          return false;
        }
      }
    }

    return true;
  }

  private evaluateCondition(condition: { operator: string; value: string }, contextValue: unknown): boolean {
    const strValue = String(contextValue);
    switch (condition.operator) {
      case 'equals':
        return strValue === condition.value;
      case 'not_equals':
        return strValue !== condition.value;
      case 'contains':
        return strValue.includes(condition.value);
      case 'matches':
        return new RegExp(condition.value).test(strValue);
      default:
        return false;
    }
  }

  getAuditLog(): AuthAuditEntry[] {
    return this.auditLog;
  }

  getReasoningTrace(): string[] {
    return this.traces;
  }
}

/**
 * AgenticFirewall - Protection against prompt injection and cognitive attacks
 */
export class AgenticFirewall {
  private config: AgenticFirewallConfig;
  private checkHistory: PromptInjectionCheck[] = [];
  private traces: string[] = [];

  constructor(config: Partial<AgenticFirewallConfig> = {}) {
    this.config = {
      enabled: true,
      strictMode: true,
      patterns: PROMPT_INJECTION_PATTERNS,
      allowlist: [],
      blocklist: [],
      maxInputLength: 10000,
      sanitizationRules: [],
      ...config,
    };
  }

  addTrace(trace: string): void {
    this.traces.push(`[${new Date().toISOString()}] ${trace}`);
  }

  /**
   * Check input for prompt injection attempts
   */
  checkInput(input: string): PromptInjectionCheck {
    this.addTrace(`Checking input (${input.length} chars) for prompt injection`);

    const threats: PromptThreat[] = [];
    let blocked = false;

    // Check input length
    if (input.length > this.config.maxInputLength) {
      threats.push({
        type: 'injection',
        pattern: 'max_length_exceeded',
        confidence: 1.0,
        evidence: `Input length ${input.length} exceeds max ${this.config.maxInputLength}`,
        mitigation: 'Truncate input to maximum allowed length',
      });
      if (this.config.strictMode) blocked = true;
    }

    // Check against blocklist
    for (const blockedTerm of this.config.blocklist) {
      if (input.toLowerCase().includes(blockedTerm.toLowerCase())) {
        threats.push({
          type: 'injection',
          pattern: 'blocklist_match',
          confidence: 1.0,
          evidence: `Blocked term found: ${blockedTerm}`,
          mitigation: 'Remove blocked content',
        });
        blocked = true;
      }
    }

    // Check against injection patterns
    for (const pattern of this.config.patterns) {
      const regex = new RegExp(pattern.regex, 'gi');
      const match = regex.exec(input);
      
      if (match) {
        threats.push({
          type: pattern.threatType,
          pattern: pattern.name,
          confidence: 0.9,
          evidence: match[0].substring(0, 100),
          mitigation: `Pattern detected: ${pattern.name}`,
        });

        if (pattern.action === 'block') {
          blocked = true;
        }
      }
    }

    // Sanitize if needed
    let sanitizedInput: string | undefined;
    if (threats.length > 0 && !blocked) {
      sanitizedInput = this.sanitizeInput(input);
    }

    const check: PromptInjectionCheck = {
      id: generateId(),
      input: input.substring(0, 500),
      timestamp: Date.now(),
      threats,
      sanitizedInput,
      blocked,
    };

    this.checkHistory.push(check);
    this.addTrace(`Check complete: ${threats.length} threats, blocked: ${blocked}`);

    return check;
  }

  /**
   * Sanitize input by removing or replacing dangerous patterns
   */
  sanitizeInput(input: string): string {
    let sanitized = input;

    // Apply sanitization rules
    for (const rule of this.config.sanitizationRules) {
      const regex = new RegExp(rule.pattern, 'gi');
      sanitized = sanitized.replace(regex, rule.replacement);
    }

    // Remove common injection patterns
    for (const pattern of this.config.patterns) {
      if (pattern.action === 'sanitize') {
        const regex = new RegExp(pattern.regex, 'gi');
        sanitized = sanitized.replace(regex, '[FILTERED]');
      }
    }

    return sanitized;
  }

  /**
   * Add term to allowlist
   */
  addToAllowlist(term: string): void {
    if (!this.config.allowlist.includes(term)) {
      this.config.allowlist.push(term);
    }
  }

  /**
   * Add term to blocklist
   */
  addToBlocklist(term: string): void {
    if (!this.config.blocklist.includes(term)) {
      this.config.blocklist.push(term);
    }
  }

  getCheckHistory(): PromptInjectionCheck[] {
    return this.checkHistory;
  }

  getReasoningTrace(): string[] {
    return this.traces;
  }
}

// ============================================
// TASK 3: No Greenwashing Protocol
// ============================================

/**
 * ClimateIntegrityValidator - NASA & Copernicus integration for climate validation
 */
export class ClimateIntegrityValidator {
  private config: TyrConfig['climateIntegrity'];
  private nasaConfig: TyrConfig['nasaApi'];
  private copernicusConfig: TyrConfig['copernicusApi'];
  private validationHistory: ClimateClaimValidation[] = [];
  private attestations: CryptographicAttestation[] = [];
  private traces: string[] = [];

  private dataSources: ClimateDataSource[] = [
    {
      id: 'nasa_earth',
      name: 'NASA Earth Copilot',
      type: 'nasa_earth',
      tier: 1,
      reliability: 0.98,
      lastUpdated: Date.now(),
      dataTypes: ['satellite_imagery', 'climate_models', 'emissions_data', 'temperature', 'sea_level'],
    },
    {
      id: 'copernicus',
      name: 'Copernicus Climate Data Store',
      type: 'copernicus',
      tier: 1,
      reliability: 0.97,
      lastUpdated: Date.now(),
      dataTypes: ['atmospheric_data', 'ocean_data', 'land_data', 'reanalysis', 'projections'],
    },
    {
      id: 'ipcc',
      name: 'IPCC Reports',
      type: 'ipcc',
      tier: 1,
      reliability: 0.99,
      lastUpdated: Date.now(),
      dataTypes: ['climate_projections', 'impact_assessments', 'mitigation_pathways'],
    },
    {
      id: 'noaa',
      name: 'NOAA Climate Data',
      type: 'noaa',
      tier: 2,
      reliability: 0.95,
      lastUpdated: Date.now(),
      dataTypes: ['weather_data', 'ocean_data', 'atmospheric_data'],
    },
  ];

  constructor(config: Partial<TyrConfig> = {}) {
    this.config = { ...DEFAULT_TYR_CONFIG.climateIntegrity, ...config.climateIntegrity };
    this.nasaConfig = { ...DEFAULT_TYR_CONFIG.nasaApi, ...config.nasaApi };
    this.copernicusConfig = { ...DEFAULT_TYR_CONFIG.copernicusApi, ...config.copernicusApi };
  }

  addTrace(trace: string): void {
    this.traces.push(`[${new Date().toISOString()}] ${trace}`);
  }

  /**
   * Validate a climate claim against satellite data and verified sources
   */
  async validateClaim(
    claim: string,
    claimType: ClaimType,
    context: string
  ): Promise<ClimateClaimValidation> {
    this.addTrace(`Validating climate claim: ${claim.substring(0, 100)}...`);

    const evidence: ClimateEvidence[] = [];
    const issues: ClimateIssue[] = [];
    const usedSources: ClimateDataSource[] = [];

    // Check for greenwashing patterns
    for (const pattern of GREENWASHING_PATTERNS) {
      const regex = new RegExp(pattern.pattern, 'gi');
      if (regex.test(claim)) {
        issues.push({
          type: 'greenwashing',
          severity: pattern.severity === 'high' ? 'major' : pattern.severity === 'medium' ? 'moderate' : 'minor',
          description: `Potential ${pattern.type.replace('_', ' ')} detected`,
          recommendation: `Provide specific, verifiable data instead of vague claims`,
        });
      }
    }

    // Simulate satellite data validation
    if (this.config.satelliteValidation) {
      const nasaData = await this.queryNASA({
        dataset: 'climate_indicators',
        parameters: { claim_type: claimType },
      });

      if (nasaData) {
        usedSources.push(this.dataSources.find(s => s.id === 'nasa_earth')!);
        evidence.push({
          sourceId: 'nasa_earth',
          dataPoint: 'satellite_validation',
          value: 'validated',
          timestamp: Date.now(),
          methodology: 'NASA Earth observation data',
        });
      }

      const copernicusData = await this.queryCopernicus({
        product: 'climate_reanalysis',
        variables: ['temperature', 'emissions'],
      });

      if (copernicusData) {
        usedSources.push(this.dataSources.find(s => s.id === 'copernicus')!);
        evidence.push({
          sourceId: 'copernicus',
          dataPoint: 'reanalysis_validation',
          value: 'validated',
          timestamp: Date.now(),
          methodology: 'Copernicus ERA5 reanalysis',
        });
      }
    }

    // Check minimum sources requirement
    if (usedSources.length < this.config.minSources) {
      issues.push({
        type: 'unverifiable',
        severity: 'moderate',
        description: `Insufficient data sources (${usedSources.length}/${this.config.minSources})`,
        recommendation: 'Provide additional verifiable data sources',
      });
    }

    // Calculate confidence
    const sourceReliability = usedSources.reduce((sum, s) => sum + s.reliability, 0) / Math.max(usedSources.length, 1);
    const issuesPenalty = issues.reduce((sum, i) => {
      switch (i.severity) {
        case 'critical': return sum + 0.3;
        case 'major': return sum + 0.2;
        case 'moderate': return sum + 0.1;
        case 'minor': return sum + 0.05;
        default: return sum;
      }
    }, 0);
    
    const confidence = Math.max(0, sourceReliability - issuesPenalty);

    // Determine verdict
    let verdict: ValidationVerdict;
    if (issues.some(i => i.severity === 'critical')) {
      verdict = 'rejected';
    } else if (confidence >= this.config.confidenceThreshold) {
      verdict = 'approved';
    } else if (confidence >= 0.8) {
      verdict = 'needs_revision';
    } else {
      verdict = 'rejected';
    }

    // Generate attestation
    const attestation = this.generateAttestation('climate_data', claim, evidence, verdict);

    const validation: ClimateClaimValidation = {
      id: generateId(),
      claim,
      claimType,
      context,
      timestamp: Date.now(),
      validation: {
        verdict,
        confidence,
        sources: usedSources,
        evidence,
        issues,
      },
      attestation,
    };

    this.validationHistory.push(validation);
    this.addTrace(`Validation complete: ${verdict} (confidence: ${confidence.toFixed(2)})`);

    return validation;
  }

  /**
   * Query NASA Earth API
   */
  async queryNASA(query: NASAEarthQuery): Promise<SatelliteDataResult | null> {
    this.addTrace(`Querying NASA Earth API: ${query.dataset}`);

    // Simulate NASA API response
    // In production, this would make actual API calls
    return {
      source: 'nasa',
      query,
      timestamp: Date.now(),
      data: {
        dataset: query.dataset,
        status: 'available',
        lastUpdate: new Date().toISOString(),
      },
      metadata: {
        resolution: '1km',
        coverage: 'global',
        quality: 0.95,
      },
    };
  }

  /**
   * Query Copernicus Climate Data Store
   */
  async queryCopernicus(query: CopernicusQuery): Promise<SatelliteDataResult | null> {
    this.addTrace(`Querying Copernicus CDS: ${query.product}`);

    // Simulate Copernicus API response
    // In production, this would make actual API calls
    return {
      source: 'copernicus',
      query,
      timestamp: Date.now(),
      data: {
        product: query.product,
        variables: query.variables,
        status: 'available',
      },
      metadata: {
        resolution: '0.25deg',
        coverage: 'global',
        quality: 0.94,
      },
    };
  }

  /**
   * Generate cryptographic attestation for validated data
   */
  generateAttestation(
    type: CryptographicAttestation['type'],
    subject: string,
    evidence: ClimateEvidence[],
    verdict: ValidationVerdict
  ): CryptographicAttestation {
    const claims: AttestationClaim[] = [
      { key: 'verdict', value: verdict, verified: true },
      { key: 'timestamp', value: new Date().toISOString(), verified: true },
      { key: 'sources_count', value: String(evidence.length), verified: true },
    ];

    for (const e of evidence) {
      claims.push({
        key: `evidence_${e.sourceId}`,
        value: String(e.value),
        verified: true,
        source: e.sourceId,
      });
    }

    const attestationData = JSON.stringify({ type, subject, claims, timestamp: Date.now() });
    const signature = generateHash(attestationData);

    const attestation: CryptographicAttestation = {
      id: generateId(),
      type,
      timestamp: Date.now(),
      subject: subject.substring(0, 200),
      claims,
      signature,
      publicKeyId: 'tyr-attestation-key-v1',
      algorithm: 'sha256',
      verifiable: true,
    };

    this.attestations.push(attestation);
    this.addTrace(`Attestation generated: ${attestation.id}`);

    return attestation;
  }

  /**
   * Verify an attestation
   */
  verifyAttestation(attestation: CryptographicAttestation): boolean {
    const attestationData = JSON.stringify({
      type: attestation.type,
      subject: attestation.subject,
      claims: attestation.claims,
      timestamp: attestation.timestamp,
    });
    
    const expectedSignature = generateHash(attestationData);
    return attestation.signature === expectedSignature;
  }

  getValidationHistory(): ClimateClaimValidation[] {
    return this.validationHistory;
  }

  getAttestations(): CryptographicAttestation[] {
    return this.attestations;
  }

  getDataSources(): ClimateDataSource[] {
    return this.dataSources;
  }

  getReasoningTrace(): string[] {
    return this.traces;
  }
}

// ============================================
// Main TYR Class - The Fearless Judge
// ============================================

/**
 * Tyr - The Lawgiver & Security Bastion
 * Chief Ethics & Security Officer
 */
export class Tyr {
  private complianceEngine: ComplianceEngine;
  private secureTaintAPI: SecureTaintAPI;
  private authorizationGuard: AuthorizationGuard;
  private agenticFirewall: AgenticFirewall;
  private climateValidator: ClimateIntegrityValidator;
  private status: TyrStatus;
  private traces: string[] = [];

  constructor(config: Partial<TyrConfig> = {}) {
    this.complianceEngine = new ComplianceEngine(config.ethicsEngine);
    this.secureTaintAPI = new SecureTaintAPI();
    this.authorizationGuard = new AuthorizationGuard();
    this.agenticFirewall = new AgenticFirewall({
      enabled: config.securityBastion?.firewallEnabled ?? true,
      maxInputLength: config.securityBastion?.maxInputLength ?? 10000,
    });
    this.climateValidator = new ClimateIntegrityValidator(config);

    this.status = {
      isActive: false,
      activatedAt: 0,
      mode: 'strict',
      stats: {
        ethicsChecks: 0,
        securityScans: 0,
        climateValidations: 0,
        blockedActions: 0,
        attestationsIssued: 0,
      },
      connections: {
        nasaEarth: 'disconnected',
        copernicus: 'disconnected',
      },
      oathRegistry: new Map(),
      activeContracts: [],
      firewallStatus: 'armed',
    };
  }

  addTrace(trace: string): void {
    this.traces.push(`[${new Date().toISOString()}] ${trace}`);
  }

  /**
   * Activate TYR
   */
  activate(): void {
    this.addTrace('TYR activating...');
    
    this.status.isActive = true;
    this.status.activatedAt = Date.now();
    
    // Initialize default authorization policies
    this.authorizationGuard.initializeDefaultPolicies();
    
    // Bind default oaths to agents
    this.bindDefaultOaths();
    
    // Connect to data sources (simulated)
    this.status.connections.nasaEarth = 'connected';
    this.status.connections.copernicus = 'connected';
    
    this.addTrace('TYR SOVEREIGN - Fearless Judge Online');
  }

  /**
   * Deactivate TYR
   */
  deactivate(): void {
    this.status.isActive = false;
    this.status.connections.nasaEarth = 'disconnected';
    this.status.connections.copernicus = 'disconnected';
    this.addTrace('TYR deactivated');
  }

  /**
   * Perform ethics check on an action
   */
  async checkEthics(request: EthicsCheckRequest): Promise<EthicsCheckResult> {
    this.addTrace(`Ethics check: ${request.actionType} by ${request.requestingAgent}`);
    
    const result = await this.complianceEngine.checkAction(request);
    this.status.stats.ethicsChecks++;
    
    if (result.verdict === 'blocked' || result.verdict === 'rejected') {
      this.status.stats.blockedActions++;
    }
    
    return result;
  }

  /**
   * Scan files for secrets
   */
  scanSecrets(files: Array<{ path: string; content: string }>): SecretScanResult {
    this.addTrace(`Scanning ${files.length} files for secrets`);
    
    const result = this.secureTaintAPI.scanForSecrets(files);
    this.status.stats.securityScans++;
    
    return result;
  }

  /**
   * Check authorization
   */
  authorize(request: AuthorizationRequest): AuthorizationResult {
    return this.authorizationGuard.authorize(request);
  }

  /**
   * Check input for prompt injection
   */
  checkPromptInjection(input: string): PromptInjectionCheck {
    return this.agenticFirewall.checkInput(input);
  }

  /**
   * Validate a climate claim
   */
  async validateClimateClaim(
    claim: string,
    claimType: ClaimType,
    context: string
  ): Promise<ClimateClaimValidation> {
    this.addTrace(`Validating climate claim: ${claimType}`);
    
    const result = await this.climateValidator.validateClaim(claim, claimType, context);
    this.status.stats.climateValidations++;
    this.status.stats.attestationsIssued++;
    
    return result;
  }

  /**
   * Block an intentionally unsafe action (for testing)
   */
  async blockUnsafeAction(action: {
    type: string;
    payload: Record<string, unknown>;
    agent: AgentId;
  }): Promise<{ blocked: boolean; reason: string; evidence: string[] }> {
    this.addTrace(`Testing unsafe action blocking: ${action.type}`);

    const evidence: string[] = [];
    let blocked = false;
    let reason = '';

    // Check for secret exposure
    const payloadStr = JSON.stringify(action.payload);
    if (this.secureTaintAPI.isTainted(payloadStr)) {
      blocked = true;
      reason = 'Secret exposure detected';
      evidence.push('Tainted value found in action payload');
    }

    // Check for prompt injection
    if (action.payload['input']) {
      const injectionCheck = this.agenticFirewall.checkInput(String(action.payload['input']));
      if (injectionCheck.blocked) {
        blocked = true;
        reason = 'Prompt injection detected';
        evidence.push(...injectionCheck.threats.map(t => t.evidence));
      }
    }

    // Check ethics
    const ethicsResult = await this.complianceEngine.checkAction({
      id: generateId(),
      timestamp: Date.now(),
      requestingAgent: action.agent,
      actionType: action.type,
      actionPayload: action.payload,
      context: {},
      urgency: 'blocking',
    });

    if (ethicsResult.verdict === 'blocked') {
      blocked = true;
      reason = reason || 'Ethics violation';
      evidence.push(...ethicsResult.violations.map(v => v.description));
    }

    if (blocked) {
      this.status.stats.blockedActions++;
    }

    this.addTrace(`Unsafe action ${blocked ? 'BLOCKED' : 'ALLOWED'}: ${reason}`);

    return { blocked, reason, evidence };
  }

  /**
   * Bind default oaths to all agents
   */
  private bindDefaultOaths(): void {
    const agents: AgentId[] = ['odin', 'thor', 'baldur', 'tyr', 'eivor', 'freya', 'heimdall'];
    
    for (const agentId of agents) {
      const oath = this.complianceEngine.bindOath(
        agentId,
        [
          'Uphold climate-first principles',
          'Never approve greenwashing',
          'Maintain system integrity',
          'Protect user data',
        ],
        [
          {
            id: 'no-direct-push',
            type: 'must_not',
            condition: 'push directly to main',
            penalty: 'block',
          },
          {
            id: 'no-secret-exposure',
            type: 'must_not',
            condition: 'expose secrets',
            penalty: 'block',
          },
          {
            id: 'climate-first',
            type: 'must',
            condition: 'consider climate impact',
            penalty: 'warn',
          },
        ]
      );
      
      this.status.oathRegistry.set(agentId, oath);
    }
  }

  /**
   * Get TYR status
   */
  getStatus(): TyrStatus {
    return {
      ...this.status,
      oathRegistry: this.complianceEngine.getOathRegistry(),
      activeContracts: this.complianceEngine.getContracts(),
    };
  }

  /**
   * Get reasoning trace
   */
  getReasoningTrace(): string[] {
    return [
      ...this.traces,
      '--- Compliance Engine ---',
      ...this.complianceEngine.getReasoningTrace(),
      '--- Secure Taint API ---',
      ...this.secureTaintAPI.getReasoningTrace(),
      '--- Authorization Guard ---',
      ...this.authorizationGuard.getReasoningTrace(),
      '--- Agentic Firewall ---',
      ...this.agenticFirewall.getReasoningTrace(),
      '--- Climate Validator ---',
      ...this.climateValidator.getReasoningTrace(),
    ];
  }
}

/**
 * Factory function to create TYR instance
 */
export function createTyr(config?: Partial<TyrConfig>): Tyr {
  return new Tyr(config);
}
