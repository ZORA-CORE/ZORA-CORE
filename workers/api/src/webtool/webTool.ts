/**
 * ZORA WebTool v2.0
 * 
 * Safe, controlled HTTP client for Nordic agents to access external web resources.
 * 
 * Features:
 * - Domain allowlist enforcement via DB registry (webtool_allowed_domains table)
 * - Auto-seeding from env vars or code defaults when registry is empty
 * - Request timeouts
 * - Response size limits
 * - Structured error handling
 * - Metrics logging via HEIMDALL
 * 
 * This module provides the foundation for ODIN's web ingestion capabilities.
 * 
 * v2.0 Changes:
 * - Primary source of truth is now webtool_allowed_domains table
 * - ZORA_WEBTOOL_ALLOWED_DOMAINS env var is only used for initial seeding
 * - In-memory caching with 60s TTL for performance
 * - Auto-add domains from curated bootstrap jobs
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Bindings } from '../types';
import { logMetricEvent } from '../middleware/logging';
import {
  isDomainAllowed as checkDomainAllowed,
  extractDomainFromUrl,
  ensureRegistrySeeded,
  loadAllowedDomains,
  getRegistryStats,
} from '../lib/webtoolRegistry';

export const WEB_TOOL_VERSION = '2.0.0';

export interface WebToolConfig {
  timeoutMs: number;
  maxResponseSizeBytes: number;
  allowedDomains: string[];
  userAgent: string;
}

export interface WebToolResult {
  url: string;
  status: number;
  headers: Record<string, string>;
  text: string;
  truncated: boolean;
  durationMs: number;
}

export interface WebToolOptions {
  timeoutMs?: number;
  maxResponseSizeBytes?: number;
  headers?: Record<string, string>;
  agent?: string;
  tenantId?: string;
  userId?: string;
  supabase?: SupabaseClient;
}

export class WebToolError extends Error {
  public code: string;
  public status: number;
  public details?: Record<string, unknown>;

  constructor(code: string, message: string, status: number = 500, details?: Record<string, unknown>) {
    super(message);
    this.name = 'WebToolError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const DEFAULT_CONFIG: WebToolConfig = {
  timeoutMs: 10000,
  maxResponseSizeBytes: 512 * 1024,
  allowedDomains: [],
  userAgent: 'ZORA-WebTool/1.0 (Climate Intelligence Platform)',
};

const DEFAULT_ALLOWED_DOMAINS = [
  'wikipedia.org',
  'en.wikipedia.org',
  'europa.eu',
  'ec.europa.eu',
  'ipcc.ch',
  'unfccc.int',
  'iea.org',
  'irena.org',
  'wri.org',
  'climatewatchdata.org',
  'ourworldindata.org',
  'carbonbrief.org',
  'nature.com',
  'science.org',
  'sciencedirect.com',
  'springer.com',
  'mdpi.com',
  'frontiersin.org',
  'gov.uk',
  'epa.gov',
  'energy.gov',
  'eia.gov',
  'noaa.gov',
  'nasa.gov',
  'un.org',
  'worldbank.org',
  'oecd.org',
  'sustainabledevelopment.un.org',
  'ghgprotocol.org',
  'cdp.net',
  'sciencebasedtargets.org',
  'globalreporting.org',
  'textileexchange.org',
  'oeko-tex.com',
  'bluesign.com',
  'fairtrade.net',
  'bettercotton.org',
  'hempindustrydaily.com',
  'hemptoday.net',
  'eiha.org',
];

function getConfig(env: Bindings): WebToolConfig {
  const envDomains = env.ZORA_WEBTOOL_ALLOWED_DOMAINS;
  const allowedDomains = envDomains
    ? envDomains.split(',').map(d => d.trim().toLowerCase())
    : DEFAULT_ALLOWED_DOMAINS;

  const timeoutMs = env.ZORA_WEBTOOL_TIMEOUT_MS
    ? parseInt(env.ZORA_WEBTOOL_TIMEOUT_MS, 10)
    : DEFAULT_CONFIG.timeoutMs;

  const maxResponseSizeBytes = env.ZORA_WEBTOOL_MAX_SIZE_BYTES
    ? parseInt(env.ZORA_WEBTOOL_MAX_SIZE_BYTES, 10)
    : DEFAULT_CONFIG.maxResponseSizeBytes;

  return {
    timeoutMs,
    maxResponseSizeBytes,
    allowedDomains,
    userAgent: DEFAULT_CONFIG.userAgent,
  };
}

function isDomainAllowed(url: string, allowedDomains: string[]): boolean {
  if (allowedDomains.length === 0) {
    return true;
  }

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    return allowedDomains.some(domain => {
      const normalizedDomain = domain.toLowerCase();
      return hostname === normalizedDomain || hostname.endsWith(`.${normalizedDomain}`);
    });
  } catch {
    return false;
  }
}

function extractDomain(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
  } catch {
    return 'unknown';
  }
}

function headersToRecord(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key.toLowerCase()] = value;
  });
  return result;
}

export async function httpGet(
  url: string,
  env: Bindings,
  options: WebToolOptions = {}
): Promise<WebToolResult> {
  const startTime = Date.now();
  const config = getConfig(env);
  const timeoutMs = options.timeoutMs ?? config.timeoutMs;
  const maxSize = options.maxResponseSizeBytes ?? config.maxResponseSizeBytes;
  const domain = extractDomainFromUrl(url) || extractDomain(url);

  let domainAllowed = false;
  
  if (options.supabase) {
    domainAllowed = await checkDomainAllowed(options.supabase, env, url);
  } else {
    domainAllowed = isDomainAllowed(url, config.allowedDomains);
  }

  if (!domainAllowed) {
    const error = new WebToolError(
      'DOMAIN_NOT_ALLOWED',
      `Domain '${domain}' is not in the allowed list`,
      403,
      { url, domain, registry_mode: options.supabase ? 'db' : 'env' }
    );

    logMetricEvent({
      category: 'webtool',
      name: 'http_get',
      tenant_id: options.tenantId,
      user_id: options.userId,
      duration_ms: Date.now() - startTime,
      success: false,
      error_code: error.code,
      metadata: { url, domain, agent: options.agent, status: 403, registry_mode: options.supabase ? 'db' : 'env' },
    });

    throw error;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const requestHeaders: Record<string, string> = {
      'User-Agent': config.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9,da;q=0.8',
      ...options.headers,
    };

    const response = await fetch(url, {
      method: 'GET',
      headers: requestHeaders,
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      const error = new WebToolError(
        'CONTENT_TOO_LARGE',
        `Response size (${contentLength} bytes) exceeds maximum allowed (${maxSize} bytes)`,
        413,
        { url, domain, content_length: parseInt(contentLength, 10), max_size: maxSize }
      );

      logMetricEvent({
        category: 'webtool',
        name: 'http_get',
        tenant_id: options.tenantId,
        user_id: options.userId,
        duration_ms: Date.now() - startTime,
        success: false,
        error_code: error.code,
        metadata: { url, domain, agent: options.agent, status: 413, content_length: parseInt(contentLength, 10), max_size: maxSize },
      });

      throw error;
    }

    let text = await response.text();
    let truncated = false;

    if (text.length > maxSize) {
      text = text.slice(0, maxSize);
      truncated = true;
    }

    const durationMs = Date.now() - startTime;

    logMetricEvent({
      category: 'webtool',
      name: 'http_get',
      tenant_id: options.tenantId,
      user_id: options.userId,
      duration_ms: durationMs,
      success: response.status >= 200 && response.status < 400,
      metadata: { url, domain, agent: options.agent, status: response.status, response_size: text.length, truncated },
    });

    return {
      url,
      status: response.status,
      headers: headersToRecord(response.headers),
      text,
      truncated,
      durationMs,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;

    if (error instanceof WebToolError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      const webToolError = new WebToolError(
        'WEB_TIMEOUT',
        `Request timed out after ${timeoutMs}ms`,
        408,
        { url, domain, timeout_ms: timeoutMs }
      );

      logMetricEvent({
        category: 'webtool',
        name: 'http_get',
        tenant_id: options.tenantId,
        user_id: options.userId,
        duration_ms: durationMs,
        success: false,
        error_code: webToolError.code,
        metadata: { url, domain, agent: options.agent, status: 408, timeout_ms: timeoutMs },
      });

      throw webToolError;
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const webToolError = new WebToolError(
      'WEB_FETCH_ERROR',
      `Failed to fetch URL: ${errorMessage}`,
      502,
      { url, domain, original_error: errorMessage }
    );

    logMetricEvent({
      category: 'webtool',
      name: 'http_get',
      tenant_id: options.tenantId,
      user_id: options.userId,
      duration_ms: durationMs,
      success: false,
      error_code: webToolError.code,
      metadata: { url, domain, agent: options.agent, status: 502, original_error: errorMessage },
    });

    throw webToolError;
  }
}

export async function httpPost(
  url: string,
  body: string | Record<string, unknown>,
  env: Bindings,
  options: WebToolOptions = {}
): Promise<WebToolResult> {
  const startTime = Date.now();
  const config = getConfig(env);
  const timeoutMs = options.timeoutMs ?? config.timeoutMs;
  const maxSize = options.maxResponseSizeBytes ?? config.maxResponseSizeBytes;
  const domain = extractDomainFromUrl(url) || extractDomain(url);

  let domainAllowed = false;
  
  if (options.supabase) {
    domainAllowed = await checkDomainAllowed(options.supabase, env, url);
  } else {
    domainAllowed = isDomainAllowed(url, config.allowedDomains);
  }

  if (!domainAllowed) {
    const error = new WebToolError(
      'DOMAIN_NOT_ALLOWED',
      `Domain '${domain}' is not in the allowed list`,
      403,
      { url, domain, registry_mode: options.supabase ? 'db' : 'env' }
    );

    logMetricEvent({
      category: 'webtool',
      name: 'http_post',
      tenant_id: options.tenantId,
      user_id: options.userId,
      duration_ms: Date.now() - startTime,
      success: false,
      error_code: error.code,
      metadata: { url, domain, agent: options.agent, status: 403, registry_mode: options.supabase ? 'db' : 'env' },
    });

    throw error;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const isJson = typeof body === 'object';
    const requestHeaders: Record<string, string> = {
      'User-Agent': config.userAgent,
      'Accept': 'application/json,text/plain,*/*',
      'Content-Type': isJson ? 'application/json' : 'text/plain',
      ...options.headers,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: requestHeaders,
      body: isJson ? JSON.stringify(body) : body,
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      const error = new WebToolError(
        'CONTENT_TOO_LARGE',
        `Response size (${contentLength} bytes) exceeds maximum allowed (${maxSize} bytes)`,
        413,
        { url, domain, content_length: parseInt(contentLength, 10), max_size: maxSize }
      );

      logMetricEvent({
        category: 'webtool',
        name: 'http_post',
        tenant_id: options.tenantId,
        user_id: options.userId,
        duration_ms: Date.now() - startTime,
        success: false,
        error_code: error.code,
        metadata: { url, domain, agent: options.agent, status: 413, content_length: parseInt(contentLength, 10), max_size: maxSize },
      });

      throw error;
    }

    let text = await response.text();
    let truncated = false;

    if (text.length > maxSize) {
      text = text.slice(0, maxSize);
      truncated = true;
    }

    const durationMs = Date.now() - startTime;

    logMetricEvent({
      category: 'webtool',
      name: 'http_post',
      tenant_id: options.tenantId,
      user_id: options.userId,
      duration_ms: durationMs,
      success: response.status >= 200 && response.status < 400,
      metadata: { url, domain, agent: options.agent, status: response.status, response_size: text.length, truncated },
    });

    return {
      url,
      status: response.status,
      headers: headersToRecord(response.headers),
      text,
      truncated,
      durationMs,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;

    if (error instanceof WebToolError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      const webToolError = new WebToolError(
        'WEB_TIMEOUT',
        `Request timed out after ${timeoutMs}ms`,
        408,
        { url, domain, timeout_ms: timeoutMs }
      );

      logMetricEvent({
        category: 'webtool',
        name: 'http_post',
        tenant_id: options.tenantId,
        user_id: options.userId,
        duration_ms: durationMs,
        success: false,
        error_code: webToolError.code,
        metadata: { url, domain, agent: options.agent, status: 408, timeout_ms: timeoutMs },
      });

      throw webToolError;
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const webToolError = new WebToolError(
      'WEB_FETCH_ERROR',
      `Failed to fetch URL: ${errorMessage}`,
      502,
      { url, domain, original_error: errorMessage }
    );

    logMetricEvent({
      category: 'webtool',
      name: 'http_post',
      tenant_id: options.tenantId,
      user_id: options.userId,
      duration_ms: durationMs,
      success: false,
      error_code: webToolError.code,
      metadata: { url, domain, agent: options.agent, status: 502, original_error: errorMessage },
    });

    throw webToolError;
  }
}

export function getWebToolInfo(env: Bindings): {
  version: string;
  config: {
    timeout_ms: number;
    max_response_size_bytes: number;
    allowed_domains_count: number;
    allowed_domains_sample: string[];
  };
} {
  const config = getConfig(env);
  return {
    version: WEB_TOOL_VERSION,
    config: {
      timeout_ms: config.timeoutMs,
      max_response_size_bytes: config.maxResponseSizeBytes,
      allowed_domains_count: config.allowedDomains.length,
      allowed_domains_sample: config.allowedDomains.slice(0, 10),
    },
  };
}

export async function getWebToolInfoWithRegistry(
  env: Bindings,
  supabase: SupabaseClient
): Promise<{
  version: string;
  config: {
    timeout_ms: number;
    max_response_size_bytes: number;
  };
  registry: {
    total: number;
    enabled: number;
    disabled: number;
    by_source: Record<string, number>;
  };
}> {
  const config = getConfig(env);
  const stats = await getRegistryStats(supabase);
  
  return {
    version: WEB_TOOL_VERSION,
    config: {
      timeout_ms: config.timeoutMs,
      max_response_size_bytes: config.maxResponseSizeBytes,
    },
    registry: stats,
  };
}

export function isWebToolConfigured(env: Bindings): boolean {
  const config = getConfig(env);
  return config.allowedDomains.length > 0;
}

export async function isWebToolConfiguredWithRegistry(
  env: Bindings,
  supabase: SupabaseClient
): Promise<boolean> {
  await ensureRegistrySeeded(supabase, env);
  const allowedDomains = await loadAllowedDomains(supabase, env);
  return allowedDomains.size > 0;
}
