/**
 * ZORA World Model / Knowledge Graph v1.0
 * 
 * Provides a graph-based view of ZORA CORE for Nordic agents (ODIN, HEIMDALL, EIVOR, TYR)
 * to reason about system relationships - both technical and semantic/climate-wise.
 * 
 * Built on top of Dev Manifest v2, with additional domain-mapping layer for
 * climate/business concepts.
 */

import {
  getDevManifestV2,
  type ModuleDefinition,
  type TableDefinition,
  type ApiEndpointDefinition,
  type WorkflowDefinition,
  type DependencyDefinition,
  type NordicAgent,
} from '../dev/devManifestV2';

export const WORLD_MODEL_VERSION = '1.0.0';

export type EntityType = 'module' | 'table' | 'endpoint' | 'workflow' | 'domain_object';

export type RelationType =
  | 'depends_on'
  | 'reads_from'
  | 'writes_to'
  | 'belongs_to'
  | 'composed_of'
  | 'flows_to'
  | 'impact_related'
  | 'has_many'
  | 'has_one'
  | 'uses_material'
  | 'linked_to_module'
  | 'references'
  | 'uses'
  | 'triggers';

export type EdgeSource = 'dev_manifest_v2' | 'manual_domain_mapping' | 'inferred';

export interface WorldNode {
  id?: string;
  entity_type: EntityType;
  key: string;
  label: string;
  description: string | null;
  module: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface WorldEdge {
  id?: string;
  from_node_id: string;
  to_node_id: string;
  relation_type: RelationType;
  source: EdgeSource;
  weight: number | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at?: string;
}

export interface WorldNodeWithId extends WorldNode {
  id: string;
}

export interface WorldEdgeWithId extends WorldEdge {
  id: string;
}

export interface WorldGraph {
  nodes: WorldNodeWithId[];
  edges: WorldEdgeWithId[];
}

export interface NeighborResult {
  node: WorldNodeWithId;
  neighbors: {
    outgoing: Array<{ edge: WorldEdgeWithId; node: WorldNodeWithId }>;
    incoming: Array<{ edge: WorldEdgeWithId; node: WorldNodeWithId }>;
  };
}

export interface SubgraphQuery {
  start: { entity_type: EntityType; key: string };
  relation_types?: RelationType[];
  max_depth?: number;
}

export interface SubgraphResult {
  nodes: WorldNodeWithId[];
  edges: WorldEdgeWithId[];
  depth_reached: number;
}

export interface WorldModelStats {
  total_nodes: number;
  total_edges: number;
  nodes_by_type: Record<EntityType, number>;
  edges_by_type: Record<string, number>;
  edges_by_source: Record<EdgeSource, number>;
}

const DOMAIN_OBJECTS: Array<{
  key: string;
  label: string;
  description: string;
  module: string;
  tags: string[];
  metadata?: Record<string, unknown>;
}> = [
  {
    key: 'tenant',
    label: 'Tenant',
    description: 'A tenant/organization in ZORA CORE - the root entity for multi-tenancy',
    module: 'auth',
    tags: ['core', 'multi-tenant', 'organization'],
  },
  {
    key: 'brand',
    label: 'Brand',
    description: 'A brand entity in ZORA SHOP - can be climate-aligned and participate in mashups',
    module: 'zora_shop',
    tags: ['shop', 'brand', 'mashup', 'climate'],
  },
  {
    key: 'organization',
    label: 'Organization',
    description: 'An organization that can run playbooks and have climate profiles',
    module: 'organizations_playbooks',
    tags: ['organization', 'playbook', 'climate'],
  },
  {
    key: 'climate_profile',
    label: 'Climate Profile',
    description: 'A climate profile for a user, household, organization, or brand - tracks footprint and missions',
    module: 'climate_os',
    tags: ['climate', 'profile', 'footprint', 'impact', 'core'],
  },
  {
    key: 'mission',
    label: 'Climate Mission',
    description: 'A concrete climate action with estimated impact - the core unit of climate progress',
    module: 'climate_os',
    tags: ['climate', 'mission', 'action', 'impact', 'core'],
  },
  {
    key: 'goes_green_profile',
    label: 'GOES GREEN Profile',
    description: 'Energy transition profile for households - tracks energy assets and green actions',
    module: 'goes_green',
    tags: ['energy', 'green', 'household', 'transition', 'climate'],
  },
  {
    key: 'goes_green_action',
    label: 'GOES GREEN Action',
    description: 'An energy transition action (solar, heat pump, EV, etc.) with impact tracking',
    module: 'goes_green',
    tags: ['energy', 'action', 'impact', 'climate'],
  },
  {
    key: 'product',
    label: 'Product',
    description: 'A climate-aligned product in ZORA SHOP with materials and climate metadata',
    module: 'zora_shop',
    tags: ['shop', 'product', 'climate', 'material'],
  },
  {
    key: 'material',
    label: 'Material',
    description: 'A material used in products - can be hemp, recycled, or other sustainable materials',
    module: 'hemp_materials',
    tags: ['material', 'hemp', 'sustainable', 'climate'],
  },
  {
    key: 'foundation_project',
    label: 'Foundation Project',
    description: 'A climate impact project funded by THE ZORA FOUNDATION',
    module: 'zora_foundation',
    tags: ['foundation', 'project', 'impact', 'climate', 'funding'],
  },
  {
    key: 'academy_lesson',
    label: 'Academy Lesson',
    description: 'An educational lesson in Climate Academy',
    module: 'climate_academy',
    tags: ['academy', 'education', 'lesson', 'climate'],
  },
  {
    key: 'academy_module',
    label: 'Academy Module',
    description: 'A module grouping lessons in Climate Academy',
    module: 'climate_academy',
    tags: ['academy', 'education', 'module', 'climate'],
  },
  {
    key: 'academy_learning_path',
    label: 'Learning Path',
    description: 'A structured learning path through Climate Academy modules',
    module: 'climate_academy',
    tags: ['academy', 'education', 'path', 'climate'],
  },
  {
    key: 'lab_experiment',
    label: 'Lab Experiment',
    description: 'A climate experiment in Quantum Climate Lab (ODIN/Quantum/NANO/SPACE/VIKINGS)',
    module: 'quantum_climate_lab',
    tags: ['lab', 'experiment', 'quantum', 'climate', 'research'],
  },
  {
    key: 'workflow_instance',
    label: 'Workflow Instance',
    description: 'A running instance of a workflow/DAG in the system',
    module: 'workflows',
    tags: ['workflow', 'dag', 'automation', 'orchestration'],
  },
  {
    key: 'agent_task',
    label: 'Agent Task',
    description: 'A task assigned to a Nordic agent for execution',
    module: 'autonomy',
    tags: ['agent', 'task', 'autonomy', 'execution'],
  },
  {
    key: 'billing_subscription',
    label: 'Subscription',
    description: 'A tenant subscription to a billing plan',
    module: 'billing',
    tags: ['billing', 'subscription', 'plan'],
  },
  {
    key: 'climate_impact',
    label: 'Climate Impact',
    description: 'Aggregated climate impact metrics (CO2, energy, etc.)',
    module: 'climate_os',
    tags: ['climate', 'impact', 'metrics', 'co2', 'core'],
  },
];

const DOMAIN_EDGES: Array<{
  from_key: string;
  from_type: EntityType;
  to_key: string;
  to_type: EntityType;
  relation_type: RelationType;
  notes: string;
}> = [
  { from_key: 'tenant', from_type: 'domain_object', to_key: 'climate_profile', to_type: 'domain_object', relation_type: 'has_many', notes: 'A tenant can have multiple climate profiles' },
  { from_key: 'tenant', from_type: 'domain_object', to_key: 'brand', to_type: 'domain_object', relation_type: 'has_many', notes: 'A tenant can own multiple brands' },
  { from_key: 'tenant', from_type: 'domain_object', to_key: 'organization', to_type: 'domain_object', relation_type: 'has_many', notes: 'A tenant can have multiple organizations' },
  { from_key: 'climate_profile', from_type: 'domain_object', to_key: 'mission', to_type: 'domain_object', relation_type: 'has_many', notes: 'A climate profile has many missions' },
  { from_key: 'mission', from_type: 'domain_object', to_key: 'climate_impact', to_type: 'domain_object', relation_type: 'impact_related', notes: 'Missions contribute to climate impact' },
  { from_key: 'goes_green_profile', from_type: 'domain_object', to_key: 'goes_green_action', to_type: 'domain_object', relation_type: 'has_many', notes: 'A GOES GREEN profile has many actions' },
  { from_key: 'goes_green_action', from_type: 'domain_object', to_key: 'climate_impact', to_type: 'domain_object', relation_type: 'impact_related', notes: 'GOES GREEN actions contribute to climate impact' },
  { from_key: 'product', from_type: 'domain_object', to_key: 'material', to_type: 'domain_object', relation_type: 'uses_material', notes: 'Products use materials' },
  { from_key: 'product', from_type: 'domain_object', to_key: 'climate_impact', to_type: 'domain_object', relation_type: 'impact_related', notes: 'Products have climate impact metadata' },
  { from_key: 'brand', from_type: 'domain_object', to_key: 'product', to_type: 'domain_object', relation_type: 'has_many', notes: 'Brands have many products' },
  { from_key: 'foundation_project', from_type: 'domain_object', to_key: 'climate_impact', to_type: 'domain_object', relation_type: 'impact_related', notes: 'Foundation projects have climate impact' },
  { from_key: 'academy_module', from_type: 'domain_object', to_key: 'academy_lesson', to_type: 'domain_object', relation_type: 'composed_of', notes: 'Academy modules contain lessons' },
  { from_key: 'academy_learning_path', from_type: 'domain_object', to_key: 'academy_module', to_type: 'domain_object', relation_type: 'composed_of', notes: 'Learning paths contain modules' },
  { from_key: 'lab_experiment', from_type: 'domain_object', to_key: 'climate_impact', to_type: 'domain_object', relation_type: 'impact_related', notes: 'Lab experiments measure climate impact' },
  { from_key: 'workflow_instance', from_type: 'domain_object', to_key: 'agent_task', to_type: 'domain_object', relation_type: 'triggers', notes: 'Workflows trigger agent tasks' },
  { from_key: 'tenant', from_type: 'domain_object', to_key: 'billing_subscription', to_type: 'domain_object', relation_type: 'has_one', notes: 'A tenant has a subscription' },
  { from_key: 'climate_profile', from_type: 'domain_object', to_key: 'climate_profiles', to_type: 'table', relation_type: 'linked_to_module', notes: 'Domain object maps to table' },
  { from_key: 'mission', from_type: 'domain_object', to_key: 'climate_missions', to_type: 'table', relation_type: 'linked_to_module', notes: 'Domain object maps to table' },
  { from_key: 'product', from_type: 'domain_object', to_key: 'products', to_type: 'table', relation_type: 'linked_to_module', notes: 'Domain object maps to table' },
  { from_key: 'material', from_type: 'domain_object', to_key: 'materials', to_type: 'table', relation_type: 'linked_to_module', notes: 'Domain object maps to table' },
  { from_key: 'brand', from_type: 'domain_object', to_key: 'brands', to_type: 'table', relation_type: 'linked_to_module', notes: 'Domain object maps to table' },
  { from_key: 'foundation_project', from_type: 'domain_object', to_key: 'foundation_projects', to_type: 'table', relation_type: 'linked_to_module', notes: 'Domain object maps to table' },
  { from_key: 'goes_green_profile', from_type: 'domain_object', to_key: 'goes_green_profiles', to_type: 'table', relation_type: 'linked_to_module', notes: 'Domain object maps to table' },
  { from_key: 'goes_green_action', from_type: 'domain_object', to_key: 'goes_green_actions', to_type: 'table', relation_type: 'linked_to_module', notes: 'Domain object maps to table' },
  { from_key: 'lab_experiment', from_type: 'domain_object', to_key: 'climate_experiments', to_type: 'table', relation_type: 'linked_to_module', notes: 'Domain object maps to table' },
  { from_key: 'agent_task', from_type: 'domain_object', to_key: 'agent_tasks', to_type: 'table', relation_type: 'linked_to_module', notes: 'Domain object maps to table' },
  { from_key: 'workflow_instance', from_type: 'domain_object', to_key: 'workflow_runs', to_type: 'table', relation_type: 'linked_to_module', notes: 'Domain object maps to table' },
  { from_key: 'billing_subscription', from_type: 'domain_object', to_key: 'tenant_subscriptions', to_type: 'table', relation_type: 'linked_to_module', notes: 'Domain object maps to table' },
  { from_key: 'academy_lesson', from_type: 'domain_object', to_key: 'academy_lessons', to_type: 'table', relation_type: 'linked_to_module', notes: 'Domain object maps to table' },
  { from_key: 'academy_module', from_type: 'domain_object', to_key: 'academy_modules', to_type: 'table', relation_type: 'linked_to_module', notes: 'Domain object maps to table' },
  { from_key: 'academy_learning_path', from_type: 'domain_object', to_key: 'academy_learning_paths', to_type: 'table', relation_type: 'linked_to_module', notes: 'Domain object maps to table' },
  { from_key: 'tenant', from_type: 'domain_object', to_key: 'tenants', to_type: 'table', relation_type: 'linked_to_module', notes: 'Domain object maps to table' },
  { from_key: 'organization', from_type: 'domain_object', to_key: 'organizations', to_type: 'table', relation_type: 'linked_to_module', notes: 'Domain object maps to table' },
];

function generateNodeId(entityType: EntityType, key: string): string {
  return `${entityType}:${key}`;
}

export function buildWorldModelFromManifest(): { nodes: WorldNode[]; edges: WorldEdge[] } {
  const manifest = getDevManifestV2();
  const nodes: WorldNode[] = [];
  const edges: WorldEdge[] = [];
  const nodeIdMap = new Map<string, string>();

  for (const mod of manifest.modules) {
    const nodeId = generateNodeId('module', mod.name);
    nodeIdMap.set(nodeId, nodeId);
    nodes.push({
      entity_type: 'module',
      key: mod.name,
      label: mod.label,
      description: mod.description,
      module: null,
      tags: mod.tags,
      metadata: {
        owner_agent: mod.owner_agent,
      },
    });
  }

  for (const table of manifest.tables) {
    const nodeId = generateNodeId('table', table.name);
    nodeIdMap.set(nodeId, nodeId);
    nodes.push({
      entity_type: 'table',
      key: table.name,
      label: table.name,
      description: table.description,
      module: table.module,
      tags: ['database', table.module],
      metadata: {
        primary_key: table.primary_key,
        column_count: table.columns.length,
        relation_count: table.relations.length,
      },
    });

    const moduleNodeId = generateNodeId('module', table.module);
    if (nodeIdMap.has(moduleNodeId)) {
      edges.push({
        from_node_id: nodeId,
        to_node_id: moduleNodeId,
        relation_type: 'belongs_to',
        source: 'dev_manifest_v2',
        weight: 1.0,
        notes: `Table ${table.name} belongs to module ${table.module}`,
        metadata: {},
      });
    }

    for (const rel of table.relations) {
      const targetTableNodeId = generateNodeId('table', rel.target_table);
      const relationType: RelationType = rel.type === 'belongs_to' ? 'belongs_to' : 
                                          rel.type === 'has_many' ? 'has_many' :
                                          rel.type === 'has_one' ? 'has_one' : 'references';
      edges.push({
        from_node_id: nodeId,
        to_node_id: targetTableNodeId,
        relation_type: relationType,
        source: 'dev_manifest_v2',
        weight: 0.8,
        notes: rel.notes || `${table.name}.${rel.via_column} -> ${rel.target_table}`,
        metadata: {
          via_column: rel.via_column,
          original_type: rel.type,
        },
      });
    }
  }

  for (const endpoint of manifest.api_endpoints) {
    const endpointKey = `${endpoint.method} ${endpoint.path}`;
    const nodeId = generateNodeId('endpoint', endpointKey);
    nodeIdMap.set(nodeId, nodeId);
    nodes.push({
      entity_type: 'endpoint',
      key: endpointKey,
      label: endpoint.summary,
      description: endpoint.summary,
      module: endpoint.module,
      tags: endpoint.tags || [endpoint.module],
      metadata: {
        method: endpoint.method,
        path: endpoint.path,
        requires_auth: endpoint.requires_auth,
        roles: endpoint.roles,
        params: endpoint.params,
      },
    });

    const moduleNodeId = generateNodeId('module', endpoint.module);
    if (nodeIdMap.has(moduleNodeId)) {
      edges.push({
        from_node_id: nodeId,
        to_node_id: moduleNodeId,
        relation_type: 'belongs_to',
        source: 'dev_manifest_v2',
        weight: 1.0,
        notes: `Endpoint ${endpointKey} belongs to module ${endpoint.module}`,
        metadata: {},
      });
    }
  }

  for (const workflow of manifest.workflows) {
    const nodeId = generateNodeId('workflow', workflow.name);
    nodeIdMap.set(nodeId, nodeId);
    nodes.push({
      entity_type: 'workflow',
      key: workflow.name,
      label: workflow.name,
      description: workflow.description,
      module: workflow.module,
      tags: ['workflow', 'dag', workflow.module, workflow.trigger],
      metadata: {
        trigger: workflow.trigger,
        step_count: workflow.steps.length,
        steps: workflow.steps,
      },
    });

    const moduleNodeId = generateNodeId('module', workflow.module);
    if (nodeIdMap.has(moduleNodeId)) {
      edges.push({
        from_node_id: nodeId,
        to_node_id: moduleNodeId,
        relation_type: 'belongs_to',
        source: 'dev_manifest_v2',
        weight: 1.0,
        notes: `Workflow ${workflow.name} belongs to module ${workflow.module}`,
        metadata: {},
      });
    }

    for (const step of workflow.steps) {
      if (step.uses_tables) {
        for (const tableName of step.uses_tables) {
          const tableNodeId = generateNodeId('table', tableName);
          edges.push({
            from_node_id: nodeId,
            to_node_id: tableNodeId,
            relation_type: 'reads_from',
            source: 'dev_manifest_v2',
            weight: 0.7,
            notes: `Workflow step "${step.step_name}" uses table ${tableName}`,
            metadata: { step_name: step.step_name },
          });
        }
      }
      if (step.calls_endpoints) {
        for (const endpointPath of step.calls_endpoints) {
          const getEndpointKey = `GET ${endpointPath}`;
          const postEndpointKey = `POST ${endpointPath}`;
          const endpointNodeId = nodeIdMap.has(generateNodeId('endpoint', getEndpointKey)) 
            ? generateNodeId('endpoint', getEndpointKey)
            : generateNodeId('endpoint', postEndpointKey);
          edges.push({
            from_node_id: nodeId,
            to_node_id: endpointNodeId,
            relation_type: 'uses',
            source: 'dev_manifest_v2',
            weight: 0.7,
            notes: `Workflow step "${step.step_name}" calls endpoint ${endpointPath}`,
            metadata: { step_name: step.step_name },
          });
        }
      }
    }
  }

  for (const dep of manifest.dependencies) {
    const fromNodeId = generateNodeId('module', dep.from);
    const toNodeId = generateNodeId('module', dep.to);
    edges.push({
      from_node_id: fromNodeId,
      to_node_id: toNodeId,
      relation_type: 'depends_on',
      source: 'dev_manifest_v2',
      weight: 1.0,
      notes: dep.reason,
      metadata: {},
    });
  }

  for (const domainObj of DOMAIN_OBJECTS) {
    const nodeId = generateNodeId('domain_object', domainObj.key);
    nodeIdMap.set(nodeId, nodeId);
    nodes.push({
      entity_type: 'domain_object',
      key: domainObj.key,
      label: domainObj.label,
      description: domainObj.description,
      module: domainObj.module,
      tags: domainObj.tags,
      metadata: domainObj.metadata || {},
    });

    const moduleNodeId = generateNodeId('module', domainObj.module);
    if (nodeIdMap.has(moduleNodeId)) {
      edges.push({
        from_node_id: nodeId,
        to_node_id: moduleNodeId,
        relation_type: 'belongs_to',
        source: 'manual_domain_mapping',
        weight: 1.0,
        notes: `Domain object ${domainObj.key} belongs to module ${domainObj.module}`,
        metadata: {},
      });
    }
  }

  for (const domainEdge of DOMAIN_EDGES) {
    const fromNodeId = generateNodeId(domainEdge.from_type, domainEdge.from_key);
    const toNodeId = generateNodeId(domainEdge.to_type, domainEdge.to_key);
    edges.push({
      from_node_id: fromNodeId,
      to_node_id: toNodeId,
      relation_type: domainEdge.relation_type,
      source: 'manual_domain_mapping',
      weight: 0.9,
      notes: domainEdge.notes,
      metadata: {},
    });
  }

  return { nodes, edges };
}

export function getWorldModelStats(nodes: WorldNode[], edges: WorldEdge[]): WorldModelStats {
  const nodesByType: Record<EntityType, number> = {
    module: 0,
    table: 0,
    endpoint: 0,
    workflow: 0,
    domain_object: 0,
  };

  for (const node of nodes) {
    nodesByType[node.entity_type]++;
  }

  const edgesByType: Record<string, number> = {};
  const edgesBySource: Record<EdgeSource, number> = {
    dev_manifest_v2: 0,
    manual_domain_mapping: 0,
    inferred: 0,
  };

  for (const edge of edges) {
    edgesByType[edge.relation_type] = (edgesByType[edge.relation_type] || 0) + 1;
    edgesBySource[edge.source]++;
  }

  return {
    total_nodes: nodes.length,
    total_edges: edges.length,
    nodes_by_type: nodesByType,
    edges_by_type: edgesByType,
    edges_by_source: edgesBySource,
  };
}

export function filterNodes(
  nodes: WorldNode[],
  filters: {
    entity_type?: EntityType;
    module?: string;
    tag?: string;
  }
): WorldNode[] {
  return nodes.filter(node => {
    if (filters.entity_type && node.entity_type !== filters.entity_type) return false;
    if (filters.module && node.module !== filters.module) return false;
    if (filters.tag && !node.tags.includes(filters.tag)) return false;
    return true;
  });
}

export function findNodeByKey(
  nodes: WorldNode[],
  entityType: EntityType,
  key: string
): WorldNode | undefined {
  return nodes.find(n => n.entity_type === entityType && n.key === key);
}

export function getNeighbors(
  nodes: WorldNode[],
  edges: WorldEdge[],
  entityType: EntityType,
  key: string
): { outgoing: Array<{ edge: WorldEdge; node: WorldNode }>; incoming: Array<{ edge: WorldEdge; node: WorldNode }> } | null {
  const nodeId = generateNodeId(entityType, key);
  const node = nodes.find(n => generateNodeId(n.entity_type, n.key) === nodeId);
  if (!node) return null;

  const outgoing: Array<{ edge: WorldEdge; node: WorldNode }> = [];
  const incoming: Array<{ edge: WorldEdge; node: WorldNode }> = [];

  for (const edge of edges) {
    if (edge.from_node_id === nodeId) {
      const [targetType, ...targetKeyParts] = edge.to_node_id.split(':');
      const targetKey = targetKeyParts.join(':');
      const targetNode = nodes.find(n => n.entity_type === targetType && n.key === targetKey);
      if (targetNode) {
        outgoing.push({ edge, node: targetNode });
      }
    }
    if (edge.to_node_id === nodeId) {
      const [sourceType, ...sourceKeyParts] = edge.from_node_id.split(':');
      const sourceKey = sourceKeyParts.join(':');
      const sourceNode = nodes.find(n => n.entity_type === sourceType && n.key === sourceKey);
      if (sourceNode) {
        incoming.push({ edge, node: sourceNode });
      }
    }
  }

  return { outgoing, incoming };
}

export function traverseSubgraph(
  nodes: WorldNode[],
  edges: WorldEdge[],
  startType: EntityType,
  startKey: string,
  relationTypes?: RelationType[],
  maxDepth: number = 2
): { nodes: WorldNode[]; edges: WorldEdge[]; depth_reached: number } {
  const startNodeId = generateNodeId(startType, startKey);
  const startNode = nodes.find(n => generateNodeId(n.entity_type, n.key) === startNodeId);
  if (!startNode) {
    return { nodes: [], edges: [], depth_reached: 0 };
  }

  const visitedNodes = new Set<string>([startNodeId]);
  const resultNodes: WorldNode[] = [startNode];
  const resultEdges: WorldEdge[] = [];
  let currentDepth = 0;

  let frontier = [startNodeId];

  while (frontier.length > 0 && currentDepth < maxDepth) {
    const nextFrontier: string[] = [];
    currentDepth++;

    for (const nodeId of frontier) {
      for (const edge of edges) {
        if (relationTypes && !relationTypes.includes(edge.relation_type)) continue;

        let neighborId: string | null = null;
        if (edge.from_node_id === nodeId) {
          neighborId = edge.to_node_id;
        } else if (edge.to_node_id === nodeId) {
          neighborId = edge.from_node_id;
        }

        if (neighborId && !visitedNodes.has(neighborId)) {
          visitedNodes.add(neighborId);
          const [neighborType, ...neighborKeyParts] = neighborId.split(':');
          const neighborKey = neighborKeyParts.join(':');
          const neighborNode = nodes.find(n => n.entity_type === neighborType && n.key === neighborKey);
          if (neighborNode) {
            resultNodes.push(neighborNode);
            resultEdges.push(edge);
            nextFrontier.push(neighborId);
          }
        } else if (neighborId && visitedNodes.has(neighborId)) {
          if (!resultEdges.includes(edge)) {
            resultEdges.push(edge);
          }
        }
      }
    }

    frontier = nextFrontier;
  }

  return {
    nodes: resultNodes,
    edges: resultEdges,
    depth_reached: currentDepth,
  };
}
