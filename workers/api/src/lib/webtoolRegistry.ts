/**
 * WebTool Registry v2.0
 * 
 * Centralized helper module for managing the webtool_allowed_domains registry.
 * This module provides:
 * - Domain lookup with in-memory caching
 * - Auto-seeding from env vars or code defaults
 * - Upsert operations for curated domain auto-registration
 * - CRUD operations for admin API
 * 
 * The registry is the primary source of truth for allowed domains.
 * ZORA_WEBTOOL_ALLOWED_DOMAINS env var is only used for initial seeding.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Bindings } from '../types';
import { logMetricEvent } from '../middleware/logging';

export const WEBTOOL_REGISTRY_VERSION = '2.0.0';

export interface AllowedDomain {
  id: string;
  domain: string;
  label: string | null;
  description: string | null;
  source: 'bootstrap_job' | 'hardcoded' | 'manual_admin' | 'env_seed';
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAllowedDomainInput {
  domain: string;
  label?: string;
  description?: string;
  source?: 'bootstrap_job' | 'hardcoded' | 'manual_admin' | 'env_seed';
  is_enabled?: boolean;
}

export interface UpdateAllowedDomainInput {
  label?: string;
  description?: string;
  is_enabled?: boolean;
}

const CACHE_TTL_MS = 60000;

let cachedDomains: Set<string> | null = null;
let cachedAt: number | null = null;

const DEFAULT_SEED_DOMAINS: Array<{ domain: string; label: string; source: 'hardcoded' }> = [
  { domain: 'en.wikipedia.org', label: 'Wikipedia (English)', source: 'hardcoded' },
  { domain: 'wikipedia.org', label: 'Wikipedia', source: 'hardcoded' },
  { domain: 'europa.eu', label: 'European Union', source: 'hardcoded' },
  { domain: 'ec.europa.eu', label: 'European Commission', source: 'hardcoded' },
  { domain: 'ipcc.ch', label: 'IPCC', source: 'hardcoded' },
  { domain: 'unfccc.int', label: 'UNFCCC', source: 'hardcoded' },
  { domain: 'iea.org', label: 'International Energy Agency', source: 'hardcoded' },
  { domain: 'irena.org', label: 'IRENA', source: 'hardcoded' },
  { domain: 'wri.org', label: 'World Resources Institute', source: 'hardcoded' },
  { domain: 'ourworldindata.org', label: 'Our World in Data', source: 'hardcoded' },
  { domain: 'un.org', label: 'United Nations', source: 'hardcoded' },
  { domain: 'worldbank.org', label: 'World Bank', source: 'hardcoded' },
  { domain: 'oecd.org', label: 'OECD', source: 'hardcoded' },
];

function normalizeDomain(domain: string): string {
  return domain.toLowerCase().trim().replace(/\.$/, '');
}

export function extractDomainFromUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return normalizeDomain(parsedUrl.hostname);
  } catch {
    return '';
  }
}

function isCacheValid(): boolean {
  if (!cachedDomains || !cachedAt) return false;
  return Date.now() - cachedAt < CACHE_TTL_MS;
}

function updateCache(domains: string[]): void {
  cachedDomains = new Set(domains.map(normalizeDomain));
  cachedAt = Date.now();
}

function addToCache(domain: string): void {
  if (cachedDomains) {
    cachedDomains.add(normalizeDomain(domain));
  }
}

function removeFromCache(domain: string): void {
  if (cachedDomains) {
    cachedDomains.delete(normalizeDomain(domain));
  }
}

export function invalidateCache(): void {
  cachedDomains = null;
  cachedAt = null;
}

async function getRegistryCount(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from('webtool_allowed_domains')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error counting webtool_allowed_domains:', error);
    return -1;
  }

  return count || 0;
}

export async function ensureRegistrySeeded(
  supabase: SupabaseClient,
  env: Bindings
): Promise<{ seeded: boolean; count: number }> {
  const existingCount = await getRegistryCount(supabase);

  if (existingCount > 0) {
    return { seeded: false, count: existingCount };
  }

  const domainsToSeed: Array<{ domain: string; label?: string; source: string }> = [];

  const envDomains = env.ZORA_WEBTOOL_ALLOWED_DOMAINS;
  if (envDomains) {
    const envDomainList = envDomains.split(',').map(d => d.trim()).filter(Boolean);
    for (const domain of envDomainList) {
      domainsToSeed.push({
        domain: normalizeDomain(domain),
        label: `Seeded from env: ${domain}`,
        source: 'env_seed',
      });
    }
  }

  for (const defaultDomain of DEFAULT_SEED_DOMAINS) {
    const normalized = normalizeDomain(defaultDomain.domain);
    if (!domainsToSeed.some(d => d.domain === normalized)) {
      domainsToSeed.push({
        domain: normalized,
        label: defaultDomain.label,
        source: defaultDomain.source,
      });
    }
  }

  if (domainsToSeed.length === 0) {
    return { seeded: false, count: 0 };
  }

  const insertData = domainsToSeed.map(d => ({
    domain: d.domain,
    label: d.label || null,
    source: d.source,
    is_enabled: true,
  }));

  const { error } = await supabase
    .from('webtool_allowed_domains')
    .upsert(insertData, { onConflict: 'domain', ignoreDuplicates: true });

  if (error) {
    console.error('Error seeding webtool_allowed_domains:', error);
    return { seeded: false, count: 0 };
  }

  logMetricEvent({
    category: 'webtool_registry',
    name: 'seeded',
    success: true,
    metadata: {
      domains_seeded: domainsToSeed.length,
      env_domains: envDomains ? envDomains.split(',').length : 0,
      hardcoded_domains: DEFAULT_SEED_DOMAINS.length,
    },
  });

  invalidateCache();

  return { seeded: true, count: domainsToSeed.length };
}

export async function loadAllowedDomains(
  supabase: SupabaseClient,
  env: Bindings
): Promise<Set<string>> {
  if (isCacheValid() && cachedDomains) {
    return cachedDomains;
  }

  await ensureRegistrySeeded(supabase, env);

  const { data, error } = await supabase
    .from('webtool_allowed_domains')
    .select('domain')
    .eq('is_enabled', true);

  if (error) {
    console.error('Error loading allowed domains:', error);
    return cachedDomains || new Set();
  }

  const domains = (data || []).map(row => normalizeDomain(row.domain));
  updateCache(domains);

  return cachedDomains!;
}

export async function isDomainAllowed(
  supabase: SupabaseClient,
  env: Bindings,
  url: string
): Promise<boolean> {
  const domain = extractDomainFromUrl(url);
  if (!domain) return false;

  const allowedDomains = await loadAllowedDomains(supabase, env);

  if (allowedDomains.has(domain)) {
    return true;
  }

  for (const allowedDomain of allowedDomains) {
    if (domain.endsWith(`.${allowedDomain}`)) {
      return true;
    }
  }

  return false;
}

export async function upsertAllowedDomain(
  supabase: SupabaseClient,
  input: CreateAllowedDomainInput
): Promise<AllowedDomain | null> {
  const normalized = normalizeDomain(input.domain);

  const { data, error } = await supabase
    .from('webtool_allowed_domains')
    .upsert(
      {
        domain: normalized,
        label: input.label || null,
        description: input.description || null,
        source: input.source || 'manual_admin',
        is_enabled: input.is_enabled ?? true,
      },
      { onConflict: 'domain' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting allowed domain:', error);
    return null;
  }

  if (data.is_enabled) {
    addToCache(normalized);
  } else {
    removeFromCache(normalized);
  }

  logMetricEvent({
    category: 'webtool_registry',
    name: 'domain_upserted',
    success: true,
    metadata: {
      domain: normalized,
      source: input.source || 'manual_admin',
      is_enabled: data.is_enabled,
    },
  });

  return data as AllowedDomain;
}

export async function ensureCuratedDomainAllowed(
  supabase: SupabaseClient,
  env: Bindings,
  url: string,
  source: 'bootstrap_job' | 'hardcoded' = 'bootstrap_job'
): Promise<{ domain: string; was_created: boolean }> {
  const domain = extractDomainFromUrl(url);
  if (!domain) {
    throw new Error(`Invalid URL: ${url}`);
  }

  const isAlreadyAllowed = await isDomainAllowed(supabase, env, url);
  if (isAlreadyAllowed) {
    return { domain, was_created: false };
  }

  const result = await upsertAllowedDomain(supabase, {
    domain,
    label: `Auto-added from ${source}`,
    source,
    is_enabled: true,
  });

  if (!result) {
    throw new Error(`Failed to add domain to allowlist: ${domain}`);
  }

  logMetricEvent({
    category: 'webtool_registry',
    name: 'curated_domain_auto_added',
    success: true,
    metadata: { domain, source, url },
  });

  return { domain, was_created: true };
}

export async function getAllAllowedDomains(
  supabase: SupabaseClient,
  options: {
    limit?: number;
    offset?: number;
    source?: string;
    is_enabled?: boolean;
  } = {}
): Promise<{ domains: AllowedDomain[]; total: number }> {
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  let query = supabase
    .from('webtool_allowed_domains')
    .select('*', { count: 'exact' })
    .order('domain', { ascending: true })
    .range(offset, offset + limit - 1);

  if (options.source) {
    query = query.eq('source', options.source);
  }

  if (options.is_enabled !== undefined) {
    query = query.eq('is_enabled', options.is_enabled);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching allowed domains:', error);
    return { domains: [], total: 0 };
  }

  return {
    domains: (data || []) as AllowedDomain[],
    total: count || 0,
  };
}

export async function getAllowedDomainById(
  supabase: SupabaseClient,
  id: string
): Promise<AllowedDomain | null> {
  const { data, error } = await supabase
    .from('webtool_allowed_domains')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching allowed domain:', error);
    return null;
  }

  return data as AllowedDomain;
}

export async function updateAllowedDomain(
  supabase: SupabaseClient,
  id: string,
  input: UpdateAllowedDomainInput
): Promise<AllowedDomain | null> {
  const updateData: Record<string, unknown> = {};

  if (input.label !== undefined) updateData.label = input.label;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.is_enabled !== undefined) updateData.is_enabled = input.is_enabled;

  if (Object.keys(updateData).length === 0) {
    return getAllowedDomainById(supabase, id);
  }

  const { data, error } = await supabase
    .from('webtool_allowed_domains')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating allowed domain:', error);
    return null;
  }

  if (input.is_enabled !== undefined) {
    if (input.is_enabled) {
      addToCache(data.domain);
    } else {
      removeFromCache(data.domain);
    }
  }

  logMetricEvent({
    category: 'webtool_registry',
    name: 'domain_updated',
    success: true,
    metadata: {
      domain_id: id,
      domain: data.domain,
      fields_updated: Object.keys(updateData),
    },
  });

  return data as AllowedDomain;
}

export async function deleteAllowedDomain(
  supabase: SupabaseClient,
  id: string
): Promise<boolean> {
  const existing = await getAllowedDomainById(supabase, id);
  if (!existing) {
    return false;
  }

  const { error } = await supabase
    .from('webtool_allowed_domains')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting allowed domain:', error);
    return false;
  }

  removeFromCache(existing.domain);

  logMetricEvent({
    category: 'webtool_registry',
    name: 'domain_deleted',
    success: true,
    metadata: { domain_id: id, domain: existing.domain },
  });

  return true;
}

export async function getRegistryStats(
  supabase: SupabaseClient
): Promise<{
  total: number;
  enabled: number;
  disabled: number;
  by_source: Record<string, number>;
}> {
  const { data, error } = await supabase
    .from('webtool_allowed_domains')
    .select('source, is_enabled');

  if (error) {
    console.error('Error fetching registry stats:', error);
    return { total: 0, enabled: 0, disabled: 0, by_source: {} };
  }

  const stats = {
    total: data.length,
    enabled: 0,
    disabled: 0,
    by_source: {} as Record<string, number>,
  };

  for (const row of data) {
    if (row.is_enabled) {
      stats.enabled++;
    } else {
      stats.disabled++;
    }

    stats.by_source[row.source] = (stats.by_source[row.source] || 0) + 1;
  }

  return stats;
}
