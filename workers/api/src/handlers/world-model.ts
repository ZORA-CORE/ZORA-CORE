/**
 * World Model / Knowledge Graph v1.0 API Handlers
 * 
 * Admin-protected endpoints for querying the ZORA World Model.
 * Used by Nordic agents (ODIN, HEIMDALL, EIVOR, TYR) and future Simulation Studio.
 */

import { Hono } from 'hono';
import type { AuthAppEnv } from '../middleware/auth';
import { jsonResponse, errorResponse } from '../lib/response';
import {
  buildWorldModelFromManifest,
  getWorldModelStats,
  filterNodes,
  findNodeByKey,
  getNeighbors,
  traverseSubgraph,
  WORLD_MODEL_VERSION,
  type EntityType,
  type RelationType,
  type WorldNode,
  type WorldEdge,
  type SubgraphQuery,
} from '../world-model/worldModel';

const worldModelHandler = new Hono<AuthAppEnv>();

let cachedWorldModel: { nodes: WorldNode[]; edges: WorldEdge[] } | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 60 * 1000;

function getWorldModel(): { nodes: WorldNode[]; edges: WorldEdge[] } {
  const now = Date.now();
  if (!cachedWorldModel || now - cacheTimestamp > CACHE_TTL_MS) {
    cachedWorldModel = buildWorldModelFromManifest();
    cacheTimestamp = now;
  }
  return cachedWorldModel;
}

/**
 * GET /api/admin/world-model/nodes
 * List all nodes in the World Model with optional filters.
 * 
 * Query params:
 * - entity_type: Filter by entity type (module, table, endpoint, workflow, domain_object)
 * - module: Filter by module name
 * - tag: Filter by tag
 * - limit: Max nodes to return (default 100)
 * - offset: Pagination offset (default 0)
 */
worldModelHandler.get('/nodes', async (c) => {
  const entityType = c.req.query('entity_type') as EntityType | undefined;
  const module = c.req.query('module');
  const tag = c.req.query('tag');
  const limit = parseInt(c.req.query('limit') || '100', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const { nodes } = getWorldModel();
  
  let filteredNodes = filterNodes(nodes, {
    entity_type: entityType,
    module: module || undefined,
    tag: tag || undefined,
  });

  const total = filteredNodes.length;
  filteredNodes = filteredNodes.slice(offset, offset + limit);

  return jsonResponse({
    version: WORLD_MODEL_VERSION,
    total,
    limit,
    offset,
    nodes: filteredNodes,
  });
});

/**
 * GET /api/admin/world-model/node
 * Get a single node by entity_type and key.
 * 
 * Query params:
 * - entity_type: Required - module, table, endpoint, workflow, domain_object
 * - key: Required - the node key
 */
worldModelHandler.get('/node', async (c) => {
  const entityType = c.req.query('entity_type') as EntityType | undefined;
  const key = c.req.query('key');

  if (!entityType || !key) {
    return errorResponse('MISSING_PARAMS', 'entity_type and key are required', 400);
  }

  const validTypes: EntityType[] = ['module', 'table', 'endpoint', 'workflow', 'domain_object'];
  if (!validTypes.includes(entityType)) {
    return errorResponse('INVALID_ENTITY_TYPE', `entity_type must be one of: ${validTypes.join(', ')}`, 400);
  }

  const { nodes } = getWorldModel();
  const node = findNodeByKey(nodes, entityType, key);

  if (!node) {
    return errorResponse('NOT_FOUND', `Node not found: ${entityType}:${key}`, 404);
  }

  return jsonResponse({
    version: WORLD_MODEL_VERSION,
    node,
  });
});

/**
 * GET /api/admin/world-model/neighbors
 * Get a node and its direct neighbors (connected nodes via edges).
 * 
 * Query params:
 * - entity_type: Required - module, table, endpoint, workflow, domain_object
 * - key: Required - the node key
 */
worldModelHandler.get('/neighbors', async (c) => {
  const entityType = c.req.query('entity_type') as EntityType | undefined;
  const key = c.req.query('key');

  if (!entityType || !key) {
    return errorResponse('MISSING_PARAMS', 'entity_type and key are required', 400);
  }

  const validTypes: EntityType[] = ['module', 'table', 'endpoint', 'workflow', 'domain_object'];
  if (!validTypes.includes(entityType)) {
    return errorResponse('INVALID_ENTITY_TYPE', `entity_type must be one of: ${validTypes.join(', ')}`, 400);
  }

  const { nodes, edges } = getWorldModel();
  const node = findNodeByKey(nodes, entityType, key);

  if (!node) {
    return errorResponse('NOT_FOUND', `Node not found: ${entityType}:${key}`, 404);
  }

  const neighbors = getNeighbors(nodes, edges, entityType, key);

  return jsonResponse({
    version: WORLD_MODEL_VERSION,
    node,
    neighbors: neighbors || { outgoing: [], incoming: [] },
  });
});

/**
 * POST /api/admin/world-model/query
 * Query a subgraph starting from a node with optional filters.
 * 
 * Request body:
 * - start: { entity_type, key } - Required starting node
 * - relation_types: Optional array of relation types to follow
 * - max_depth: Optional max traversal depth (default 2, max 5)
 */
worldModelHandler.post('/query', async (c) => {
  let query: SubgraphQuery;
  try {
    query = await c.req.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  if (!query.start || !query.start.entity_type || !query.start.key) {
    return errorResponse('MISSING_PARAMS', 'start.entity_type and start.key are required', 400);
  }

  const validTypes: EntityType[] = ['module', 'table', 'endpoint', 'workflow', 'domain_object'];
  if (!validTypes.includes(query.start.entity_type)) {
    return errorResponse('INVALID_ENTITY_TYPE', `entity_type must be one of: ${validTypes.join(', ')}`, 400);
  }

  const maxDepth = Math.min(query.max_depth || 2, 5);

  const { nodes, edges } = getWorldModel();
  const result = traverseSubgraph(
    nodes,
    edges,
    query.start.entity_type,
    query.start.key,
    query.relation_types,
    maxDepth
  );

  if (result.nodes.length === 0) {
    return errorResponse('NOT_FOUND', `Starting node not found: ${query.start.entity_type}:${query.start.key}`, 404);
  }

  return jsonResponse({
    version: WORLD_MODEL_VERSION,
    query: {
      start: query.start,
      relation_types: query.relation_types || 'all',
      max_depth: maxDepth,
    },
    result: {
      node_count: result.nodes.length,
      edge_count: result.edges.length,
      depth_reached: result.depth_reached,
      nodes: result.nodes,
      edges: result.edges,
    },
  });
});

/**
 * GET /api/admin/world-model/stats
 * Get statistics about the World Model.
 */
worldModelHandler.get('/stats', async (c) => {
  const { nodes, edges } = getWorldModel();
  const stats = getWorldModelStats(nodes, edges);

  return jsonResponse({
    version: WORLD_MODEL_VERSION,
    generated_at: new Date().toISOString(),
    stats,
  });
});

/**
 * GET /api/admin/world-model/edges
 * List all edges in the World Model with optional filters.
 * 
 * Query params:
 * - relation_type: Filter by relation type
 * - source: Filter by source (dev_manifest_v2, manual_domain_mapping, inferred)
 * - limit: Max edges to return (default 100)
 * - offset: Pagination offset (default 0)
 */
worldModelHandler.get('/edges', async (c) => {
  const relationType = c.req.query('relation_type') as RelationType | undefined;
  const source = c.req.query('source');
  const limit = parseInt(c.req.query('limit') || '100', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const { edges } = getWorldModel();
  
  let filteredEdges = edges.filter(edge => {
    if (relationType && edge.relation_type !== relationType) return false;
    if (source && edge.source !== source) return false;
    return true;
  });

  const total = filteredEdges.length;
  filteredEdges = filteredEdges.slice(offset, offset + limit);

  return jsonResponse({
    version: WORLD_MODEL_VERSION,
    total,
    limit,
    offset,
    edges: filteredEdges,
  });
});

/**
 * GET /api/admin/world-model/climate-graph
 * Get a climate-focused subgraph showing climate-related entities and relationships.
 * Useful for agents reasoning about climate impact.
 */
worldModelHandler.get('/climate-graph', async (c) => {
  const { nodes, edges } = getWorldModel();
  
  const climateTags = ['climate', 'impact', 'energy', 'green', 'foundation', 'mission'];
  const climateNodes = nodes.filter(node => 
    node.tags.some(tag => climateTags.includes(tag))
  );

  const climateNodeIds = new Set(climateNodes.map(n => `${n.entity_type}:${n.key}`));
  const climateEdges = edges.filter(edge => 
    climateNodeIds.has(edge.from_node_id) || climateNodeIds.has(edge.to_node_id)
  );

  return jsonResponse({
    version: WORLD_MODEL_VERSION,
    description: 'Climate-focused subgraph of the ZORA World Model',
    filter_tags: climateTags,
    node_count: climateNodes.length,
    edge_count: climateEdges.length,
    nodes: climateNodes,
    edges: climateEdges,
  });
});

/**
 * GET /api/admin/world-model/module-graph
 * Get a module-level graph showing only modules and their dependencies.
 * Useful for high-level architecture understanding.
 */
worldModelHandler.get('/module-graph', async (c) => {
  const { nodes, edges } = getWorldModel();
  
  const moduleNodes = nodes.filter(node => node.entity_type === 'module');
  const moduleNodeIds = new Set(moduleNodes.map(n => `module:${n.key}`));
  
  const moduleEdges = edges.filter(edge => 
    moduleNodeIds.has(edge.from_node_id) && moduleNodeIds.has(edge.to_node_id)
  );

  return jsonResponse({
    version: WORLD_MODEL_VERSION,
    description: 'Module-level dependency graph',
    node_count: moduleNodes.length,
    edge_count: moduleEdges.length,
    nodes: moduleNodes,
    edges: moduleEdges,
  });
});

/**
 * GET /api/admin/world-model/domain-graph
 * Get the domain object graph showing business/climate concepts and their relationships.
 * Useful for semantic reasoning about the ZORA domain.
 */
worldModelHandler.get('/domain-graph', async (c) => {
  const { nodes, edges } = getWorldModel();
  
  const domainNodes = nodes.filter(node => node.entity_type === 'domain_object');
  const domainNodeIds = new Set(domainNodes.map(n => `domain_object:${n.key}`));
  
  const domainEdges = edges.filter(edge => 
    (domainNodeIds.has(edge.from_node_id) && domainNodeIds.has(edge.to_node_id)) ||
    (edge.source === 'manual_domain_mapping')
  );

  return jsonResponse({
    version: WORLD_MODEL_VERSION,
    description: 'Domain object graph showing business/climate concepts',
    node_count: domainNodes.length,
    edge_count: domainEdges.length,
    nodes: domainNodes,
    edges: domainEdges,
  });
});

export default worldModelHandler;
