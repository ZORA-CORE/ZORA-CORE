/**
 * ZORA WebTool v2.0
 * 
 * Safe, controlled HTTP client for Nordic agents to access external web resources.
 * 
 * v2.0: Now uses DB-managed domain registry (webtool_allowed_domains table)
 * instead of env-only configuration.
 */

export {
  httpGet,
  httpPost,
  getWebToolInfo,
  getWebToolInfoWithRegistry,
  isWebToolConfigured,
  isWebToolConfiguredWithRegistry,
  WebToolError,
  WEB_TOOL_VERSION,
  type WebToolConfig,
  type WebToolResult,
  type WebToolOptions,
} from './webTool';

export {
  ensureRegistrySeeded,
  loadAllowedDomains,
  isDomainAllowed,
  upsertAllowedDomain,
  ensureCuratedDomainAllowed,
  getAllAllowedDomains,
  getAllowedDomainById,
  updateAllowedDomain,
  deleteAllowedDomain,
  getRegistryStats,
  extractDomainFromUrl,
  invalidateCache,
  WEBTOOL_REGISTRY_VERSION,
  type AllowedDomain,
  type CreateAllowedDomainInput,
  type UpdateAllowedDomainInput,
} from '../lib/webtoolRegistry';
