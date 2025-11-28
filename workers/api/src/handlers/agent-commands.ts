import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { AuthAppEnv } from '../middleware/auth';
import type { 
  AgentCommand, 
  AgentCommandListItem, 
  CreateAgentCommandInput,
  AgentTaskListItem,
} from '../types';
import { jsonResponse } from '../lib/response';

const app = new Hono<AuthAppEnv>();

const VALID_AGENT_IDS = ['CONNOR', 'LUMINA', 'EIVOR', 'ORACLE', 'AEGIS', 'SAM'];
const VALID_STATUSES = ['received', 'parsing', 'tasks_created', 'failed'];

// Agent task types reference - used to help LUMINA understand what each agent can do
const AGENT_TASK_TYPES: Record<string, Record<string, string>> = {
  ORACLE: {
    propose_new_climate_missions: 'Analyze a climate profile and suggest new climate missions',
    research_topic: 'Research a specific topic related to climate, sustainability, or strategy',
    analyze_climate_data: 'Analyze climate data and provide insights',
  },
  SAM: {
    review_climate_page: 'Review the /climate page and suggest UX improvements',
    review_accessibility: 'Review a page for accessibility issues',
    design_component: 'Design a new UI component or feature',
    review_frontend_page: 'Review any frontend page and suggest improvements',
  },
  LUMINA: {
    plan_frontend_improvements: 'Plan improvements for a frontend page',
    plan_workflow: 'Create a workflow plan for a complex goal',
    coordinate_agents: 'Coordinate multiple agents for a complex task',
  },
  EIVOR: {
    summarize_recent_activity: 'Summarize recent system activity and decisions',
    search_memories: 'Search memories for relevant context',
    create_knowledge_summary: 'Create a summary of knowledge on a topic',
  },
  CONNOR: {
    review_system_health: 'Review system health and suggest improvements',
    analyze_api_performance: 'Analyze API performance and suggest optimizations',
    review_database_schema: 'Review database schema and suggest improvements',
  },
  AEGIS: {
    review_climate_claims: 'Review climate claims for greenwashing',
    safety_audit: 'Conduct a safety audit of a feature or system',
    compliance_check: 'Check compliance with climate standards',
  },
};

interface PlannedTask {
  agent_id: string;
  task_type: string;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  priority: number;
}

interface PlanResult {
  summary: string;
  tasks: PlannedTask[];
}

/**
 * Build the planning prompt for LUMINA
 */
function buildPlanningPrompt(rawPrompt: string, targetAgents: string[] | null): string {
  // Build agent capabilities section
  const agentsToUse = targetAgents && targetAgents.length > 0
    ? targetAgents.map(a => a.toUpperCase()).filter(a => AGENT_TASK_TYPES[a])
    : Object.keys(AGENT_TASK_TYPES);

  let capabilitiesText = '';
  for (const agentId of agentsToUse) {
    const tasks = AGENT_TASK_TYPES[agentId];
    if (tasks) {
      capabilitiesText += `\n${agentId}:\n`;
      for (const [taskType, description] of Object.entries(tasks)) {
        capabilitiesText += `  - ${taskType}: ${description}\n`;
      }
    }
  }

  return `You are LUMINA, the Planner/Orchestrator for ZORA CORE.

The Founder has given you a command in natural language. Your job is to analyze this command and create a plan of agent tasks that will accomplish the goal.

## Founder's Command:
"${rawPrompt}"

## Available Agents and Their Task Types:
${capabilitiesText}

## Instructions:
1. Analyze the command to understand what the Founder wants
2. Decide which agent(s) should handle this and what task type(s) to use
3. Create 1-5 tasks that together will accomplish the goal
4. Each task should be specific and actionable

## Output Format:
Return a JSON object with this structure:
{
  "summary": "Brief summary of what will be done",
  "tasks": [
    {
      "agent_id": "AGENT_NAME",
      "task_type": "task_type_from_list_above",
      "title": "Short descriptive title",
      "description": "Detailed description of what this task should accomplish",
      "payload": {},
      "priority": 0
    }
  ]
}

If the command is unclear or cannot be mapped to tasks, return:
{
  "summary": "Unable to plan: [reason]",
  "tasks": []
}

Return ONLY the JSON object, no other text.`;
}

/**
 * Call OpenAI to plan the command using LUMINA
 */
async function planCommandWithLumina(
  rawPrompt: string,
  targetAgents: string[] | null,
  openaiApiKey: string | undefined
): Promise<PlanResult> {
  // If no OpenAI key, create a simple fallback plan
  if (!openaiApiKey) {
    console.log('No OpenAI API key, using fallback planning');
    return createFallbackPlan(rawPrompt, targetAgents);
  }

  const prompt = buildPlanningPrompt(rawPrompt, targetAgents);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'You are LUMINA, the Planner/Orchestrator for ZORA CORE. You respond only with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, await response.text());
      return createFallbackPlan(rawPrompt, targetAgents);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };
    
    let content = data.choices[0]?.message?.content || '';
    
    // Handle markdown code blocks
    if (content.startsWith('```')) {
      const lines = content.split('\n');
      if (lines[lines.length - 1].trim() === '```') {
        content = lines.slice(1, -1).join('\n');
      } else {
        content = lines.slice(1).join('\n');
      }
    }

    const planData = JSON.parse(content) as PlanResult;
    
    // Validate and filter tasks
    const validTasks = (planData.tasks || []).filter(task => {
      const agentId = task.agent_id?.toUpperCase();
      return agentId && VALID_AGENT_IDS.includes(agentId);
    }).map(task => ({
      ...task,
      agent_id: task.agent_id.toUpperCase(),
    }));

    return {
      summary: planData.summary || 'Command processed',
      tasks: validTasks,
    };
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return createFallbackPlan(rawPrompt, targetAgents);
  }
}

/**
 * Create a fallback plan when OpenAI is not available
 */
function createFallbackPlan(rawPrompt: string, targetAgents: string[] | null): PlanResult {
  const promptLower = rawPrompt.toLowerCase();
  const tasks: PlannedTask[] = [];

  // Simple keyword-based routing
  if (promptLower.includes('climate') || promptLower.includes('mission')) {
    tasks.push({
      agent_id: 'ORACLE',
      task_type: 'propose_new_climate_missions',
      title: 'Analyze and propose climate missions',
      description: rawPrompt,
      payload: { source: 'command_console' },
      priority: 1,
    });
  }

  if (promptLower.includes('frontend') || promptLower.includes('ui') || promptLower.includes('page')) {
    tasks.push({
      agent_id: 'SAM',
      task_type: 'review_frontend_page',
      title: 'Review frontend and suggest improvements',
      description: rawPrompt,
      payload: { source: 'command_console' },
      priority: 1,
    });
  }

  if (promptLower.includes('plan') || promptLower.includes('workflow')) {
    tasks.push({
      agent_id: 'LUMINA',
      task_type: 'plan_workflow',
      title: 'Create workflow plan',
      description: rawPrompt,
      payload: { source: 'command_console' },
      priority: 1,
    });
  }

  if (promptLower.includes('safety') || promptLower.includes('greenwash') || promptLower.includes('audit')) {
    tasks.push({
      agent_id: 'AEGIS',
      task_type: 'safety_audit',
      title: 'Conduct safety audit',
      description: rawPrompt,
      payload: { source: 'command_console' },
      priority: 1,
    });
  }

  if (promptLower.includes('system') || promptLower.includes('health') || promptLower.includes('api')) {
    tasks.push({
      agent_id: 'CONNOR',
      task_type: 'review_system_health',
      title: 'Review system health',
      description: rawPrompt,
      payload: { source: 'command_console' },
      priority: 1,
    });
  }

  if (promptLower.includes('memory') || promptLower.includes('summarize') || promptLower.includes('history')) {
    tasks.push({
      agent_id: 'EIVOR',
      task_type: 'summarize_recent_activity',
      title: 'Summarize recent activity',
      description: rawPrompt,
      payload: { source: 'command_console' },
      priority: 1,
    });
  }

  // If target agents specified but no tasks created, create generic tasks for them
  if (tasks.length === 0 && targetAgents && targetAgents.length > 0) {
    for (const agent of targetAgents) {
      const agentUpper = agent.toUpperCase();
      if (VALID_AGENT_IDS.includes(agentUpper)) {
        const taskTypes = AGENT_TASK_TYPES[agentUpper];
        const firstTaskType = Object.keys(taskTypes)[0];
        tasks.push({
          agent_id: agentUpper,
          task_type: firstTaskType,
          title: `${agentUpper} task from command`,
          description: rawPrompt,
          payload: { source: 'command_console' },
          priority: 1,
        });
      }
    }
  }

  // If still no tasks, default to LUMINA for planning
  if (tasks.length === 0) {
    tasks.push({
      agent_id: 'LUMINA',
      task_type: 'plan_workflow',
      title: 'Process command',
      description: rawPrompt,
      payload: { source: 'command_console' },
      priority: 1,
    });
  }

  return {
    summary: `Created ${tasks.length} task(s) from command (fallback mode)`,
    tasks,
  };
}

/**
 * GET /api/agents/commands
 * List agent commands with optional filters
 */
app.get('/commands', async (c) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = c.env;
  const tenantId = c.get('tenantId');

  if (!tenantId) {
    return jsonResponse(
      { error: 'UNAUTHORIZED', message: 'Authentication required', status: 401 },
      401
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Parse query parameters
  const status = c.req.query('status');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  // Build query
  let query = supabase
    .from('agent_commands')
    .select('id, raw_prompt, target_agents, status, parsed_summary, tasks_created_count, created_at, updated_at', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (status && VALID_STATUSES.includes(status)) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching agent commands:', error);
    return jsonResponse(
      { error: 'DATABASE_ERROR', message: error.message, status: 500 },
      500
    );
  }

  return jsonResponse({
    data: data as AgentCommandListItem[],
    pagination: {
      limit,
      offset,
      total: count || 0,
      has_more: (count || 0) > offset + limit,
    },
  });
});

/**
 * GET /api/agents/commands/:id
 * Get a single agent command by ID
 */
app.get('/commands/:id', async (c) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = c.env;
  const tenantId = c.get('tenantId');
  const commandId = c.req.param('id');

  if (!tenantId) {
    return jsonResponse(
      { error: 'UNAUTHORIZED', message: 'Authentication required', status: 401 },
      401
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data, error } = await supabase
    .from('agent_commands')
    .select('*')
    .eq('id', commandId)
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return jsonResponse(
        { error: 'NOT_FOUND', message: `Command '${commandId}' not found`, status: 404 },
        404
      );
    }
    console.error('Error fetching agent command:', error);
    return jsonResponse(
      { error: 'DATABASE_ERROR', message: error.message, status: 500 },
      500
    );
  }

  // Also fetch associated tasks
  const { data: tasksData } = await supabase
    .from('agent_tasks')
    .select('id, agent_id, task_type, status, priority, title, created_at, started_at, completed_at')
    .eq('tenant_id', tenantId)
    .contains('payload', { source_command_id: commandId })
    .order('created_at', { ascending: true });

  return jsonResponse({ 
    data: data as AgentCommand,
    tasks: (tasksData || []) as AgentTaskListItem[],
  });
});

/**
 * POST /api/agents/commands
 * Create a new agent command and execute it
 */
app.post('/commands', async (c) => {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY } = c.env;
  const tenantId = c.get('tenantId');
  const userId = c.get('userId');
  const userRole = c.get('userRole');

  if (!tenantId) {
    return jsonResponse(
      { error: 'UNAUTHORIZED', message: 'Authentication required', status: 401 },
      401
    );
  }

  // Only founder and brand_admin can create commands
  if (userRole !== 'founder' && userRole !== 'brand_admin') {
    return jsonResponse(
      { error: 'FORBIDDEN', message: 'Only founder or brand_admin can create commands', status: 403 },
      403
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  let body: CreateAgentCommandInput;
  try {
    body = await c.req.json();
  } catch {
    return jsonResponse(
      { error: 'INVALID_JSON', message: 'Request body must be valid JSON', status: 400 },
      400
    );
  }

  // Validate required fields
  if (!body.raw_prompt || body.raw_prompt.trim().length === 0) {
    return jsonResponse(
      {
        error: 'VALIDATION_ERROR',
        message: 'raw_prompt is required and cannot be empty',
        status: 400,
      },
      400
    );
  }

  // Validate target_agents if provided
  if (body.target_agents && body.target_agents.length > 0) {
    const invalidAgents = body.target_agents.filter(
      a => !VALID_AGENT_IDS.includes(a.toUpperCase())
    );
    if (invalidAgents.length > 0) {
      return jsonResponse(
        {
          error: 'VALIDATION_ERROR',
          message: `Invalid agent(s): ${invalidAgents.join(', ')}. Valid agents: ${VALID_AGENT_IDS.join(', ')}`,
          status: 400,
        },
        400
      );
    }
  }

  // Create the command record
  const commandData = {
    tenant_id: tenantId,
    raw_prompt: body.raw_prompt.trim(),
    target_agents: body.target_agents?.map(a => a.toUpperCase()) || null,
    status: 'received',
    created_by_user_id: userId || null,
  };

  const { data: commandResult, error: commandError } = await supabase
    .from('agent_commands')
    .insert(commandData)
    .select()
    .single();

  if (commandError) {
    console.error('Error creating agent command:', commandError);
    return jsonResponse(
      { error: 'DATABASE_ERROR', message: commandError.message, status: 500 },
      500
    );
  }

  const command = commandResult as AgentCommand;

  // Update status to parsing
  await supabase
    .from('agent_commands')
    .update({ status: 'parsing' })
    .eq('id', command.id);

  // Plan the command using LUMINA
  const planResult = await planCommandWithLumina(
    body.raw_prompt,
    body.target_agents || null,
    OPENAI_API_KEY
  );

  // Create agent_tasks from the plan
  const createdTasks: AgentTaskListItem[] = [];
  
  for (const task of planResult.tasks) {
    const taskData = {
      tenant_id: tenantId,
      agent_id: task.agent_id,
      task_type: task.task_type,
      title: task.title,
      description: task.description,
      payload: {
        ...task.payload,
        source_command_id: command.id,
      },
      priority: task.priority,
      status: 'pending',
      created_by_user_id: userId || null,
    };

    const { data: taskResult, error: taskError } = await supabase
      .from('agent_tasks')
      .insert(taskData)
      .select('id, agent_id, task_type, status, priority, title, created_at, started_at, completed_at')
      .single();

    if (taskError) {
      console.error('Error creating task:', taskError);
      continue;
    }

    if (taskResult) {
      createdTasks.push(taskResult as AgentTaskListItem);
    }
  }

  // Update command status
  const finalStatus = createdTasks.length > 0 ? 'tasks_created' : 'failed';
  const errorMessage = createdTasks.length === 0 ? 'No tasks could be created from the command' : null;

  await supabase
    .from('agent_commands')
    .update({
      status: finalStatus,
      parsed_summary: planResult.summary,
      tasks_created_count: createdTasks.length,
      error_message: errorMessage,
    })
    .eq('id', command.id);

  // Create journal entry
  await supabase.from('journal_entries').insert({
    tenant_id: tenantId,
    category: 'agent_action',
    title: `Command executed: ${createdTasks.length} task(s) created`,
    body: `Command: ${body.raw_prompt.substring(0, 200)}${body.raw_prompt.length > 200 ? '...' : ''}\n\nSummary: ${planResult.summary}`,
    details: {
      event_type: 'agent_command_executed',
      command_id: command.id,
      tasks_created: createdTasks.length,
      task_ids: createdTasks.map(t => t.id),
    },
    author: 'LUMINA',
  });

  // Fetch the updated command
  const { data: updatedCommand } = await supabase
    .from('agent_commands')
    .select('*')
    .eq('id', command.id)
    .single();

  return jsonResponse({
    data: {
      command: updatedCommand as AgentCommand,
      tasks_created: createdTasks,
      summary: planResult.summary,
    },
  }, 201);
});

export default app;
