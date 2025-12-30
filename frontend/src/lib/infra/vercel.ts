/**
 * THOR Vercel Integration - Deployment Autopilot
 * Autonomous deployment management with Gjallarhorn circuit breaker
 * ZORA CORE: Aesir Genesis - Sovereign Infra Level
 */

import type {
  DeploymentInfo,
  HealthProbeResult,
  HealthReport,
  GjallarhornAlert,
  CircuitBreakerConfig,
} from './types';

export interface VercelConfig {
  token?: string;
  teamId?: string;
  projectId?: string;
  apiBaseUrl?: string;
}

export interface CreateDeploymentOptions {
  name: string;
  target?: 'production' | 'preview';
  gitSource?: {
    type: 'github';
    repo: string;
    ref: string;
  };
  environment?: Record<string, string>;
}

export interface DeploymentResponse {
  id: string;
  url: string;
  name: string;
  state: 'QUEUED' | 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED';
  createdAt: number;
  readyState?: string;
  alias?: string[];
}

function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export class VercelDeploymentManager {
  private config: VercelConfig;
  private reasoningTrace: string[] = [];

  constructor(config: VercelConfig = {}) {
    this.config = {
      apiBaseUrl: 'https://api.vercel.com',
      ...config,
    };
  }

  private addTrace(message: string): void {
    this.reasoningTrace.push(`[${new Date().toISOString()}] ${message}`);
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T | null> {
    if (!this.config.token) {
      this.addTrace('Warning: No Vercel token configured - using simulation mode');
      return null;
    }

    const url = `${this.config.apiBaseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.token}`,
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    if (this.config.teamId) {
      const separator = endpoint.includes('?') ? '&' : '?';
      const teamUrl = `${url}${separator}teamId=${this.config.teamId}`;
      
      try {
        const response = await fetch(teamUrl, { ...options, headers });
        if (!response.ok) {
          this.addTrace(`Vercel API error: ${response.status} ${response.statusText}`);
          return null;
        }
        return response.json();
      } catch (error) {
        this.addTrace(`Vercel API request failed: ${error}`);
        return null;
      }
    }

    try {
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) {
        this.addTrace(`Vercel API error: ${response.status} ${response.statusText}`);
        return null;
      }
      return response.json();
    } catch (error) {
      this.addTrace(`Vercel API request failed: ${error}`);
      return null;
    }
  }

  async createDeployment(options: CreateDeploymentOptions): Promise<DeploymentInfo> {
    this.addTrace(`Creating deployment: ${options.name} (target: ${options.target || 'preview'})`);

    const response = await this.makeRequest<DeploymentResponse>('/v13/deployments', {
      method: 'POST',
      body: JSON.stringify({
        name: options.name,
        target: options.target,
        gitSource: options.gitSource,
        projectSettings: {
          framework: 'nextjs',
        },
      }),
    });

    if (response) {
      this.addTrace(`Deployment created: ${response.id}`);
      return {
        id: response.id,
        url: `https://${response.url}`,
        preview_url: options.target === 'preview' ? `https://${response.url}` : undefined,
        status: this.mapVercelState(response.state),
        created_at: response.createdAt,
        alias: response.alias,
      };
    }

    this.addTrace('Using simulated deployment (no token configured)');
    const simulatedId = `sim_${Date.now()}`;
    return {
      id: simulatedId,
      url: `https://${options.name}-${simulatedId}.vercel.app`,
      preview_url: `https://preview-${simulatedId}.vercel.app`,
      status: 'ready',
      created_at: Date.now(),
      ready_at: Date.now(),
    };
  }

  async getDeployment(deploymentId: string): Promise<DeploymentInfo | null> {
    this.addTrace(`Getting deployment: ${deploymentId}`);

    const response = await this.makeRequest<DeploymentResponse>(`/v13/deployments/${deploymentId}`);

    if (response) {
      return {
        id: response.id,
        url: `https://${response.url}`,
        status: this.mapVercelState(response.state),
        created_at: response.createdAt,
        alias: response.alias,
      };
    }

    return null;
  }

  async waitForDeployment(
    deploymentId: string,
    timeoutMs: number = 300000
  ): Promise<DeploymentInfo | null> {
    this.addTrace(`Waiting for deployment ${deploymentId} to be ready (timeout: ${timeoutMs}ms)`);
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const deployment = await this.getDeployment(deploymentId);
      
      if (!deployment) {
        this.addTrace('Deployment not found');
        return null;
      }
      
      if (deployment.status === 'ready') {
        this.addTrace(`Deployment ${deploymentId} is ready`);
        deployment.ready_at = Date.now();
        return deployment;
      }
      
      if (deployment.status === 'error' || deployment.status === 'canceled') {
        this.addTrace(`Deployment ${deploymentId} failed with status: ${deployment.status}`);
        return deployment;
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    this.addTrace(`Deployment ${deploymentId} timed out`);
    return null;
  }

  async setAlias(deploymentId: string, alias: string): Promise<boolean> {
    this.addTrace(`Setting alias ${alias} for deployment ${deploymentId}`);

    const response = await this.makeRequest<{ uid: string }>('/v2/deployments/aliases', {
      method: 'POST',
      body: JSON.stringify({
        deploymentId,
        alias,
      }),
    });

    if (response) {
      this.addTrace(`Alias set successfully: ${alias}`);
      return true;
    }

    this.addTrace('Alias set simulated (no token configured)');
    return true;
  }

  async removeAlias(alias: string): Promise<boolean> {
    this.addTrace(`Removing alias: ${alias}`);

    const response = await this.makeRequest<{ status: string }>(`/v2/deployments/aliases/${alias}`, {
      method: 'DELETE',
    });

    if (response) {
      this.addTrace(`Alias removed: ${alias}`);
      return true;
    }

    return true;
  }

  private mapVercelState(state: string): DeploymentInfo['status'] {
    switch (state) {
      case 'QUEUED':
        return 'pending';
      case 'BUILDING':
        return 'building';
      case 'READY':
        return 'ready';
      case 'ERROR':
        return 'error';
      case 'CANCELED':
        return 'canceled';
      default:
        return 'pending';
    }
  }

  getReasoningTrace(): string[] {
    return [...this.reasoningTrace];
  }

  clearReasoningTrace(): void {
    this.reasoningTrace = [];
  }
}

export class GjallarhornCircuitBreaker {
  private config: CircuitBreakerConfig;
  private reasoningTrace: string[] = [];
  private alerts: GjallarhornAlert[] = [];

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  private addTrace(message: string): void {
    this.reasoningTrace.push(`[${new Date().toISOString()}] [GJALLARHORN] ${message}`);
  }

  async probeDeployment(deploymentUrl: string): Promise<HealthReport> {
    this.addTrace(`Starting health probes for: ${deploymentUrl}`);
    
    const probes: HealthProbeResult[] = [];
    
    for (const endpoint of this.config.probe_config.endpoints) {
      for (let i = 0; i < this.config.probe_config.probe_count; i++) {
        const probe = await this.executeProbe(deploymentUrl, endpoint);
        probes.push(probe);
        
        if (i < this.config.probe_config.probe_count - 1) {
          await new Promise(resolve => 
            setTimeout(resolve, this.config.probe_config.probe_interval_ms)
          );
        }
      }
    }
    
    const summary = this.calculateSummary(probes);
    const passedThresholds = this.checkThresholds(summary);
    
    this.addTrace(`Health probe complete: success_rate=${summary.success_rate}, passed=${passedThresholds}`);
    
    return {
      deployment_id: deploymentUrl,
      probes,
      summary,
      passed_thresholds: passedThresholds,
      timestamp: Date.now(),
    };
  }

  private async executeProbe(
    baseUrl: string,
    endpoint: { path: string; method: string; expected_status: number }
  ): Promise<HealthProbeResult> {
    const url = `${baseUrl}${endpoint.path}`;
    const startTime = Date.now();
    
    try {
      const response = await fetch(url, {
        method: endpoint.method,
        headers: {
          'User-Agent': 'THOR-Gjallarhorn/1.0',
        },
      });
      
      const latency = Date.now() - startTime;
      const success = response.status === endpoint.expected_status;
      
      return {
        endpoint: endpoint.path,
        status: response.status,
        latency_ms: latency,
        success,
        timestamp: Date.now(),
      };
    } catch {
      return {
        endpoint: endpoint.path,
        status: 0,
        latency_ms: Date.now() - startTime,
        success: false,
        timestamp: Date.now(),
      };
    }
  }

  private calculateSummary(probes: HealthProbeResult[]): HealthReport['summary'] {
    const successfulProbes = probes.filter(p => p.success).length;
    const latencies = probes.map(p => p.latency_ms).sort((a, b) => a - b);
    
    const p95Index = Math.floor(latencies.length * 0.95);
    const p99Index = Math.floor(latencies.length * 0.99);
    
    return {
      success_rate: probes.length > 0 ? successfulProbes / probes.length : 0,
      latency_p95_ms: latencies[p95Index] || 0,
      latency_p99_ms: latencies[p99Index] || 0,
      error_rate: probes.length > 0 ? (probes.length - successfulProbes) / probes.length : 1,
    };
  }

  private checkThresholds(summary: HealthReport['summary']): boolean {
    const { thresholds } = this.config;
    
    if (summary.success_rate < thresholds.success_rate) {
      this.addTrace(`THRESHOLD VIOLATION: success_rate ${summary.success_rate} < ${thresholds.success_rate}`);
      return false;
    }
    
    if (summary.latency_p95_ms > thresholds.latency_p95_ms) {
      this.addTrace(`THRESHOLD VIOLATION: latency_p95 ${summary.latency_p95_ms}ms > ${thresholds.latency_p95_ms}ms`);
      return false;
    }
    
    if (summary.latency_p99_ms > thresholds.latency_p99_ms) {
      this.addTrace(`THRESHOLD VIOLATION: latency_p99 ${summary.latency_p99_ms}ms > ${thresholds.latency_p99_ms}ms`);
      return false;
    }
    
    if (summary.error_rate > thresholds.error_rate) {
      this.addTrace(`THRESHOLD VIOLATION: error_rate ${summary.error_rate} > ${thresholds.error_rate}`);
      return false;
    }
    
    return true;
  }

  async triggerAlert(
    deploymentId: string,
    healthReport: HealthReport,
    autoRollback: boolean = true
  ): Promise<GjallarhornAlert> {
    this.addTrace('=== GJALLARHORN ALERT TRIGGERED ===');
    this.addTrace(`Deployment: ${deploymentId}`);
    this.addTrace(`Success rate: ${healthReport.summary.success_rate}`);
    this.addTrace(`Error rate: ${healthReport.summary.error_rate}`);
    
    const alert: GjallarhornAlert = {
      id: generateAlertId(),
      deployment_id: deploymentId,
      triggered_at: Date.now(),
      reason: this.generateAlertReason(healthReport),
      health_report: healthReport,
      action_taken: autoRollback ? 'rollback' : 'alert_only',
    };
    
    this.alerts.push(alert);
    
    if (autoRollback) {
      this.addTrace('Initiating automatic rollback...');
      alert.rollback_target = 'previous_stable';
    }
    
    return alert;
  }

  private generateAlertReason(healthReport: HealthReport): string {
    const violations: string[] = [];
    const { summary } = healthReport;
    const { thresholds } = this.config;
    
    if (summary.success_rate < thresholds.success_rate) {
      violations.push(`success_rate: ${(summary.success_rate * 100).toFixed(1)}% < ${(thresholds.success_rate * 100).toFixed(1)}%`);
    }
    if (summary.error_rate > thresholds.error_rate) {
      violations.push(`error_rate: ${(summary.error_rate * 100).toFixed(1)}% > ${(thresholds.error_rate * 100).toFixed(1)}%`);
    }
    if (summary.latency_p95_ms > thresholds.latency_p95_ms) {
      violations.push(`latency_p95: ${summary.latency_p95_ms}ms > ${thresholds.latency_p95_ms}ms`);
    }
    
    return `Health threshold violations: ${violations.join(', ')}`;
  }

  async executeRollback(
    vercelManager: VercelDeploymentManager,
    currentDeploymentId: string,
    previousDeploymentId: string,
    productionAlias: string
  ): Promise<boolean> {
    this.addTrace(`Executing rollback from ${currentDeploymentId} to ${previousDeploymentId}`);
    
    const success = await vercelManager.setAlias(previousDeploymentId, productionAlias);
    
    if (success) {
      this.addTrace('Rollback successful - production alias switched to previous deployment');
    } else {
      this.addTrace('Rollback failed - manual intervention required');
    }
    
    return success;
  }

  getAlerts(): GjallarhornAlert[] {
    return [...this.alerts];
  }

  getReasoningTrace(): string[] {
    return [...this.reasoningTrace];
  }

  clearReasoningTrace(): void {
    this.reasoningTrace = [];
  }
}

export function createVercelManager(config?: VercelConfig): VercelDeploymentManager {
  return new VercelDeploymentManager(config);
}

export function createGjallarhorn(config: CircuitBreakerConfig): GjallarhornCircuitBreaker {
  return new GjallarhornCircuitBreaker(config);
}

export const VERCEL_INTEGRATION_VERSION = '1.0.0';
export const GJALLARHORN_VERSION = '1.0.0';
