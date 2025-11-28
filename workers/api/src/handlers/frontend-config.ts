import { Hono } from 'hono';
import type { FrontendConfig, FrontendConfigResponse, UpdateFrontendConfigInput, HomePageConfig, ClimatePageConfig } from '../types';
import type { AuthAppEnv } from '../middleware/auth';
import { getTenantId } from '../middleware/auth';
import { getSupabaseClient } from '../lib/supabase';
import {
  badRequestResponse,
  notFoundResponse,
  serverErrorResponse,
} from '../lib/response';

const app = new Hono<AuthAppEnv>();

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

function mergeWithDefaults(page: string, storedConfig: Record<string, unknown>): Record<string, unknown> {
  const defaults = getDefaultConfig(page);
  return { ...defaults, ...storedConfig };
}

app.get('/:page', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const page = c.req.param('page');

    if (!page) {
      return badRequestResponse('Page parameter is required');
    }

    const supabase = getSupabaseClient(c.env);

    const { data, error } = await supabase
      .from('frontend_configs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('page', page)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching frontend config:', error);
      return serverErrorResponse('Failed to fetch frontend config');
    }

    if (!data) {
      const defaultConfig = getDefaultConfig(page);
      const response: FrontendConfigResponse = {
        page,
        config: defaultConfig,
        is_default: true,
      };
      return c.json(response);
    }

    const config = data as FrontendConfig;
    const mergedConfig = mergeWithDefaults(page, config.config as Record<string, unknown>);

    const response: FrontendConfigResponse = {
      page,
      config: mergedConfig,
      id: config.id,
      tenant_id: config.tenant_id,
      is_default: false,
      created_at: config.created_at,
      updated_at: config.updated_at,
    };

    return c.json(response);
  } catch (error) {
    console.error('Frontend config get error:', error);
    return serverErrorResponse('Failed to fetch frontend config');
  }
});

app.put('/:page', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const page = c.req.param('page');

    if (!page) {
      return badRequestResponse('Page parameter is required');
    }

    const body = await c.req.json<UpdateFrontendConfigInput>();

    if (!body.config || typeof body.config !== 'object') {
      return badRequestResponse('Config object is required');
    }

    const supabase = getSupabaseClient(c.env);

    const { data: existingConfig, error: fetchError } = await supabase
      .from('frontend_configs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('page', page)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching existing config:', fetchError);
      return serverErrorResponse('Failed to fetch existing config');
    }

    const oldConfig = existingConfig?.config || null;
    let savedConfig: FrontendConfig;

    if (existingConfig) {
      const { data, error } = await supabase
        .from('frontend_configs')
        .update({
          config: body.config,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingConfig.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating frontend config:', error);
        return serverErrorResponse('Failed to update frontend config');
      }

      savedConfig = data as FrontendConfig;
    } else {
      const { data, error } = await supabase
        .from('frontend_configs')
        .insert({
          tenant_id: tenantId,
          page,
          config: body.config,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating frontend config:', error);
        return serverErrorResponse('Failed to create frontend config');
      }

      savedConfig = data as FrontendConfig;
    }

    const { error: journalError } = await supabase.from('journal_entries').insert({
      tenant_id: tenantId,
      category: 'config_change',
      title: `Frontend config updated for page "${page}"`,
      body: null,
      details: {
        event_type: 'frontend_config_updated',
        page,
        old_config: oldConfig,
        new_config: body.config,
      },
      related_entity_ids: [savedConfig.id],
      author: 'frontend_config',
    });

    if (journalError) {
      console.error('Failed to insert journal entry:', journalError);
    }

    const mergedConfig = mergeWithDefaults(page, savedConfig.config as Record<string, unknown>);

    const response: FrontendConfigResponse = {
      page,
      config: mergedConfig,
      id: savedConfig.id,
      tenant_id: savedConfig.tenant_id,
      is_default: false,
      created_at: savedConfig.created_at,
      updated_at: savedConfig.updated_at,
    };

    return c.json(response);
  } catch (error) {
    console.error('Frontend config update error:', error);
    return serverErrorResponse('Failed to update frontend config');
  }
});

export default app;
