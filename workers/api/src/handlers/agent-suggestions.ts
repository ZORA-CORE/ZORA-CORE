import { Hono } from 'hono';
import type {
  AgentSuggestion,
  AgentSuggestionResponse,
  AgentSuggestionListItem,
  CreateSuggestionInput,
  SuggestionDecisionInput,
  HomePageConfig,
  ClimatePageConfig,
  ClimateContext,
} from '../types';
import type { AuthAppEnv } from '../middleware/auth';
import { getTenantId, getUserId } from '../middleware/auth';
import { getSupabaseClient } from '../lib/supabase';
import {
  badRequestResponse,
  notFoundResponse,
  serverErrorResponse,
} from '../lib/response';

const app = new Hono<AuthAppEnv>();

// Default configs for each page (same as frontend-config.ts)
const DEFAULT_HOME_CONFIG: HomePageConfig = {
  hero_title: 'ZORA CORE',
  hero_subtitle: 'Climate-first AI Operating System.',
  primary_cta_label: 'Open Climate OS',
  primary_cta_link: '/climate',
  show_climate_dashboard: true,
  show_missions_section: true,
};

const DEFAULT_CLIMATE_CONFIG: ClimatePageConfig = {
  hero_title: 'ZORA Climate OS',
  hero_subtitle: 'Track your missions and impact.',
  show_profile_section: true,
  show_dashboard_section: true,
  show_missions_section: true,
};

function getDefaultConfig(page: string): Record<string, unknown> {
  switch (page) {
    case 'home':
      return { ...DEFAULT_HOME_CONFIG };
    case 'climate':
      return { ...DEFAULT_CLIMATE_CONFIG };
    default:
      return {};
  }
}

function generateDiffSummary(
  current: Record<string, unknown>,
  suggested: Record<string, unknown>
): string {
  const changes: string[] = [];

  for (const [key, newValue] of Object.entries(suggested)) {
    const oldValue = current[key];
    if (oldValue !== newValue) {
      if (typeof newValue === 'boolean') {
        const action = newValue ? 'Show' : 'Hide';
        const fieldName = key.replace('show_', '').replace(/_/g, ' ');
        changes.push(`${action} ${fieldName}`);
      } else if (typeof newValue === 'string' && typeof oldValue === 'string') {
        if (newValue.length > 50) {
          changes.push(`Update ${key}`);
        } else {
          changes.push(`Change ${key} to "${newValue}"`);
        }
      } else {
        changes.push(`Update ${key}`);
      }
    }
  }

  if (changes.length === 0) {
    return 'No changes suggested';
  }

  return changes.join('; ');
}

function validateConfig(page: string, config: Record<string, unknown>): Record<string, unknown> {
  const defaults = getDefaultConfig(page);
  const validated = { ...defaults };

  for (const key of Object.keys(defaults)) {
    if (key in config) {
      const value = config[key];
      const defaultValue = defaults[key];

      if (typeof defaultValue === 'boolean' && typeof value === 'boolean') {
        validated[key] = value;
      } else if (typeof defaultValue === 'string' && typeof value === 'string') {
        if (value.trim()) {
          validated[key] = value.trim();
        }
      }
    }
  }

  return validated;
}

async function getClimateContext(
  supabase: ReturnType<typeof getSupabaseClient>,
  tenantId: string
): Promise<ClimateContext | null> {
  try {
    // Get first profile for tenant
    const { data: profile } = await supabase
      .from('climate_profiles')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .limit(1)
      .single();

    if (!profile) {
      return null;
    }

    // Get missions summary
    const { data: missions } = await supabase
      .from('climate_missions')
      .select('status, category, estimated_impact_kgco2')
      .eq('tenant_id', tenantId)
      .eq('profile_id', profile.id);

    const totalMissions = missions?.length || 0;
    const completedMissions = missions?.filter((m) => m.status === 'completed').length || 0;
    const totalImpact = missions?.reduce((sum, m) => sum + (m.estimated_impact_kgco2 || 0), 0) || 0;
    const categories = [...new Set(missions?.map((m) => m.category).filter(Boolean) || [])];

    return {
      profile_name: profile.name,
      total_missions: totalMissions,
      completed_missions: completedMissions,
      total_impact_kgco2: totalImpact,
      categories: categories as string[],
    };
  } catch (error) {
    console.error('Error fetching climate context:', error);
    return null;
  }
}

async function generateSuggestionWithLLM(
  openaiApiKey: string,
  page: string,
  currentConfig: Record<string, unknown>,
  climateContext: ClimateContext | null
): Promise<{ suggested_config: Record<string, unknown>; reasoning: string }> {
  const prompt = buildSuggestionPrompt(page, currentConfig, climateContext);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are SAM, a frontend architect for a climate-first AI system.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    let responseText = data.choices[0]?.message?.content || '';

    // Parse JSON from response
    if (responseText.includes('```json')) {
      responseText = responseText.split('```json')[1].split('```')[0];
    } else if (responseText.includes('```')) {
      responseText = responseText.split('```')[1].split('```')[0];
    }

    const result = JSON.parse(responseText.trim());
    return {
      suggested_config: result.suggested_config || {},
      reasoning: result.reasoning || 'No reasoning provided',
    };
  } catch (error) {
    console.error('LLM suggestion generation failed:', error);
    // Return stub suggestion on failure
    return generateStubSuggestion(page, currentConfig);
  }
}

function generateStubSuggestion(
  page: string,
  currentConfig: Record<string, unknown>
): { suggested_config: Record<string, unknown>; reasoning: string } {
  const suggestedConfig = { ...currentConfig };

  if (page === 'home') {
    suggestedConfig.hero_subtitle =
      'Your climate-first AI companion. Track impact, complete missions, make a difference.';
  } else if (page === 'climate') {
    suggestedConfig.hero_subtitle =
      'Every action counts. Track your progress and see your impact grow.';
  }

  return {
    suggested_config: suggestedConfig,
    reasoning: 'Updated subtitle to be more engaging and action-oriented.',
  };
}

function buildSuggestionPrompt(
  page: string,
  currentConfig: Record<string, unknown>,
  climateContext: ClimateContext | null
): string {
  let prompt = `You are SAM, the Frontend & Experience Architect for ZORA CORE, a climate-first AI Operating System.

Your task is to suggest improvements to the frontend configuration for the "${page}" page.

Current configuration:
\`\`\`json
${JSON.stringify(currentConfig, null, 2)}
\`\`\`

`;

  if (climateContext) {
    prompt += `Climate context for this tenant:
- Profile: ${climateContext.profile_name || 'Unknown'}
- Total missions: ${climateContext.total_missions}
- Completed missions: ${climateContext.completed_missions}
- Total impact: ${climateContext.total_impact_kgco2} kg CO2
- Categories: ${climateContext.categories.join(', ') || 'None'}

`;
  }

  if (page === 'home') {
    prompt += `The home page (dashboard) has these configurable fields:
- hero_title: Main heading (string)
- hero_subtitle: Subheading text (string)
- primary_cta_label: Button text (string)
- primary_cta_link: Button link (string)
- show_climate_dashboard: Show climate summary section (boolean)
- show_missions_section: Show recent missions section (boolean)

`;
  } else if (page === 'climate') {
    prompt += `The climate page has these configurable fields:
- hero_title: Main heading (string)
- hero_subtitle: Subheading text (string)
- show_profile_section: Show climate profile section (boolean)
- show_dashboard_section: Show dashboard stats section (boolean)
- show_missions_section: Show missions section (boolean)

`;
  }

  prompt += `Guidelines:
1. Keep the climate-first mission in mind
2. Make text engaging but honest (no greenwashing)
3. Consider what sections would be most useful for this tenant
4. Keep hero text concise and impactful
5. Only suggest changes that would improve the user experience

Respond with a JSON object containing:
1. "suggested_config": The complete suggested configuration (all fields)
2. "reasoning": Brief explanation of why you made these changes

Example response:
\`\`\`json
{
  "suggested_config": {
    "hero_title": "Your Climate Journey",
    "hero_subtitle": "Track your impact and take action.",
    ...
  },
  "reasoning": "Updated hero text to be more personal and action-oriented."
}
\`\`\`

Respond ONLY with the JSON object, no other text.`;

  return prompt;
}

// POST /api/agents/autonomy/frontend/suggest - Generate a new suggestion
app.post('/suggest', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const body = await c.req.json<CreateSuggestionInput>();

    const page = body.page;
    const agentId = body.agent_id || 'SAM';

    if (!page || !['home', 'climate'].includes(page)) {
      return badRequestResponse('Page must be "home" or "climate"');
    }

    const supabase = getSupabaseClient(c.env);

    // Get current config or defaults
    const { data: existingConfig } = await supabase
      .from('frontend_configs')
      .select('config')
      .eq('tenant_id', tenantId)
      .eq('page', page)
      .single();

    const currentConfig = existingConfig?.config
      ? { ...getDefaultConfig(page), ...(existingConfig.config as Record<string, unknown>) }
      : getDefaultConfig(page);

    // Get climate context for better suggestions
    const climateContext = await getClimateContext(supabase, tenantId);

    // Generate suggestion using LLM or stub
    let suggestedConfig: Record<string, unknown>;
    let reasoning: string;

    if (c.env.OPENAI_API_KEY) {
      const result = await generateSuggestionWithLLM(
        c.env.OPENAI_API_KEY,
        page,
        currentConfig,
        climateContext
      );
      suggestedConfig = result.suggested_config;
      reasoning = result.reasoning;
    } else {
      const result = generateStubSuggestion(page, currentConfig);
      suggestedConfig = result.suggested_config;
      reasoning = result.reasoning;
    }

    // Validate suggested config
    const validatedConfig = validateConfig(page, suggestedConfig);

    // Generate diff summary
    const diffSummary = generateDiffSummary(currentConfig, validatedConfig);

    // Insert suggestion into database
    const { data: suggestion, error: insertError } = await supabase
      .from('agent_suggestions')
      .insert({
        tenant_id: tenantId,
        agent_id: agentId,
        suggestion_type: 'frontend_config_change',
        target_page: page,
        current_config: currentConfig,
        suggested_config: validatedConfig,
        diff_summary: diffSummary + (reasoning ? ` (${reasoning})` : ''),
        status: 'proposed',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting suggestion:', insertError);
      return serverErrorResponse('Failed to create suggestion');
    }

    // Insert journal entry for suggestion creation
    const { error: journalError } = await supabase.from('journal_entries').insert({
      tenant_id: tenantId,
      category: 'autonomy',
      title: `${agentId} proposed a frontend config change for page "${page}"`,
      body: diffSummary,
      details: {
        event_type: 'agent_suggestion_created',
        suggestion_id: suggestion.id,
        agent_id: agentId,
        page,
        diff_summary: diffSummary,
      },
      related_entity_ids: [suggestion.id],
      author: agentId.toLowerCase(),
    });

    if (journalError) {
      console.error('Failed to insert journal entry:', journalError);
    }

    const response: AgentSuggestionResponse = {
      id: suggestion.id,
      agent_id: suggestion.agent_id,
      suggestion_type: suggestion.suggestion_type,
      target_page: suggestion.target_page,
      current_config: suggestion.current_config,
      suggested_config: suggestion.suggested_config,
      diff_summary: suggestion.diff_summary,
      status: suggestion.status,
      decision_by_user_id: suggestion.decision_by_user_id,
      decision_reason: suggestion.decision_reason,
      created_at: suggestion.created_at,
      updated_at: suggestion.updated_at,
    };

    return c.json(response, 201);
  } catch (error) {
    console.error('Suggestion creation error:', error);
    return serverErrorResponse('Failed to create suggestion');
  }
});

// GET /api/agents/autonomy/frontend/suggestions - List suggestions
app.get('/suggestions', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const status = c.req.query('status');
    const page = c.req.query('page');

    const supabase = getSupabaseClient(c.env);

    let query = supabase
      .from('agent_suggestions')
      .select('id, agent_id, suggestion_type, target_page, diff_summary, status, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (status && ['proposed', 'applied', 'rejected'].includes(status)) {
      query = query.eq('status', status);
    }

    if (page && ['home', 'climate'].includes(page)) {
      query = query.eq('target_page', page);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching suggestions:', error);
      return serverErrorResponse('Failed to fetch suggestions');
    }

    const suggestions: AgentSuggestionListItem[] = (data || []).map((s) => ({
      id: s.id,
      agent_id: s.agent_id,
      suggestion_type: s.suggestion_type,
      target_page: s.target_page,
      diff_summary: s.diff_summary,
      status: s.status,
      created_at: s.created_at,
      updated_at: s.updated_at,
    }));

    return c.json({ data: suggestions });
  } catch (error) {
    console.error('Suggestions list error:', error);
    return serverErrorResponse('Failed to fetch suggestions');
  }
});

// GET /api/agents/autonomy/frontend/suggestions/:id - Get suggestion details
app.get('/suggestions/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const suggestionId = c.req.param('id');

    if (!suggestionId) {
      return badRequestResponse('Suggestion ID is required');
    }

    const supabase = getSupabaseClient(c.env);

    const { data, error } = await supabase
      .from('agent_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .eq('tenant_id', tenantId)
      .single();

    if (error && error.code === 'PGRST116') {
      return notFoundResponse('Suggestion not found');
    }

    if (error) {
      console.error('Error fetching suggestion:', error);
      return serverErrorResponse('Failed to fetch suggestion');
    }

    const suggestion = data as AgentSuggestion;

    const response: AgentSuggestionResponse = {
      id: suggestion.id,
      agent_id: suggestion.agent_id,
      suggestion_type: suggestion.suggestion_type,
      target_page: suggestion.target_page,
      current_config: suggestion.current_config,
      suggested_config: suggestion.suggested_config,
      diff_summary: suggestion.diff_summary,
      status: suggestion.status,
      decision_by_user_id: suggestion.decision_by_user_id,
      decision_reason: suggestion.decision_reason,
      created_at: suggestion.created_at,
      updated_at: suggestion.updated_at,
    };

    return c.json(response);
  } catch (error) {
    console.error('Suggestion detail error:', error);
    return serverErrorResponse('Failed to fetch suggestion');
  }
});

// POST /api/agents/autonomy/frontend/suggestions/:id/decision - Apply or reject suggestion
app.post('/suggestions/:id/decision', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const userId = getUserId(c);
    const suggestionId = c.req.param('id');

    if (!suggestionId) {
      return badRequestResponse('Suggestion ID is required');
    }

    const body = await c.req.json<SuggestionDecisionInput>();

    if (!body.decision || !['apply', 'reject'].includes(body.decision)) {
      return badRequestResponse('Decision must be "apply" or "reject"');
    }

    const supabase = getSupabaseClient(c.env);

    // Fetch the suggestion
    const { data: suggestion, error: fetchError } = await supabase
      .from('agent_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError && fetchError.code === 'PGRST116') {
      return notFoundResponse('Suggestion not found');
    }

    if (fetchError) {
      console.error('Error fetching suggestion:', fetchError);
      return serverErrorResponse('Failed to fetch suggestion');
    }

    if (suggestion.status !== 'proposed') {
      return badRequestResponse(`Suggestion has already been ${suggestion.status}`);
    }

    const now = new Date().toISOString();

    if (body.decision === 'apply') {
      // Apply the suggestion: update frontend_configs
      const page = suggestion.target_page;
      const suggestedConfig = suggestion.suggested_config;

      // Check if config exists
      const { data: existingConfig } = await supabase
        .from('frontend_configs')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('page', page)
        .single();

      if (existingConfig) {
        // Update existing config
        const { error: updateError } = await supabase
          .from('frontend_configs')
          .update({
            config: suggestedConfig,
            updated_at: now,
          })
          .eq('id', existingConfig.id);

        if (updateError) {
          console.error('Error updating frontend config:', updateError);
          return serverErrorResponse('Failed to apply suggestion');
        }
      } else {
        // Create new config
        const { error: insertError } = await supabase.from('frontend_configs').insert({
          tenant_id: tenantId,
          page,
          config: suggestedConfig,
        });

        if (insertError) {
          console.error('Error creating frontend config:', insertError);
          return serverErrorResponse('Failed to apply suggestion');
        }
      }

      // Update suggestion status
      const { error: suggestionUpdateError } = await supabase
        .from('agent_suggestions')
        .update({
          status: 'applied',
          decision_by_user_id: userId,
          decision_reason: body.reason || null,
          updated_at: now,
        })
        .eq('id', suggestionId);

      if (suggestionUpdateError) {
        console.error('Error updating suggestion status:', suggestionUpdateError);
      }

      // Insert journal entries for applied suggestion
      await supabase.from('journal_entries').insert([
        {
          tenant_id: tenantId,
          category: 'config_change',
          title: `Frontend config updated for page "${page}" (via agent suggestion)`,
          body: null,
          details: {
            event_type: 'frontend_config_updated',
            page,
            old_config: suggestion.current_config,
            new_config: suggestedConfig,
            applied_from_suggestion: suggestionId,
          },
          related_entity_ids: [suggestionId],
          author: 'autonomy_layer',
        },
        {
          tenant_id: tenantId,
          category: 'autonomy',
          title: `${suggestion.agent_id}'s suggestion for "${page}" was applied`,
          body: suggestion.diff_summary,
          details: {
            event_type: 'agent_suggestion_applied',
            suggestion_id: suggestionId,
            agent_id: suggestion.agent_id,
            page,
            decision_by_user_id: userId,
            decision_reason: body.reason || null,
          },
          related_entity_ids: [suggestionId],
          author: 'autonomy_layer',
        },
      ]);

      // Create EIVOR memory event for applied suggestion
      await supabase.from('memory_events').insert({
        tenant_id: tenantId,
        agent: 'eivor',
        memory_type: 'decision',
        content: `${suggestion.agent_id} proposed a new frontend config for the ${page} page which was accepted by the Founder. Changes: ${suggestion.diff_summary}`,
        tags: ['autonomy', 'suggestion', 'applied', page, suggestion.agent_id.toLowerCase()],
        metadata: {
          suggestion_id: suggestionId,
          agent_id: suggestion.agent_id,
          page,
          decision: 'applied',
        },
      });

      return c.json({
        success: true,
        message: 'Suggestion applied successfully',
        suggestion_id: suggestionId,
        status: 'applied',
      });
    } else {
      // Reject the suggestion
      const { error: suggestionUpdateError } = await supabase
        .from('agent_suggestions')
        .update({
          status: 'rejected',
          decision_by_user_id: userId,
          decision_reason: body.reason || null,
          updated_at: now,
        })
        .eq('id', suggestionId);

      if (suggestionUpdateError) {
        console.error('Error updating suggestion status:', suggestionUpdateError);
        return serverErrorResponse('Failed to reject suggestion');
      }

      // Insert journal entry for rejected suggestion
      await supabase.from('journal_entries').insert({
        tenant_id: tenantId,
        category: 'autonomy',
        title: `${suggestion.agent_id}'s suggestion for "${suggestion.target_page}" was rejected`,
        body: body.reason || 'No reason provided',
        details: {
          event_type: 'agent_suggestion_rejected',
          suggestion_id: suggestionId,
          agent_id: suggestion.agent_id,
          page: suggestion.target_page,
          decision_by_user_id: userId,
          decision_reason: body.reason || null,
        },
        related_entity_ids: [suggestionId],
        author: 'autonomy_layer',
      });

      // Create EIVOR memory event for rejected suggestion
      await supabase.from('memory_events').insert({
        tenant_id: tenantId,
        agent: 'eivor',
        memory_type: 'decision',
        content: `${suggestion.agent_id} proposed a frontend config change for the ${suggestion.target_page} page; the Founder rejected this.${body.reason ? ` Reason: ${body.reason}` : ''}`,
        tags: ['autonomy', 'suggestion', 'rejected', suggestion.target_page, suggestion.agent_id.toLowerCase()],
        metadata: {
          suggestion_id: suggestionId,
          agent_id: suggestion.agent_id,
          page: suggestion.target_page,
          decision: 'rejected',
          reason: body.reason || null,
        },
      });

      return c.json({
        success: true,
        message: 'Suggestion rejected',
        suggestion_id: suggestionId,
        status: 'rejected',
      });
    }
  } catch (error) {
    console.error('Suggestion decision error:', error);
    return serverErrorResponse('Failed to process decision');
  }
});

export default app;
