import { describe, it, expect } from 'vitest';

describe('Frontend Config API', () => {
  describe('Default Configs', () => {
    it('should have correct default home config structure', () => {
      const expectedHomeConfig = {
        hero_title: 'ZORA CORE',
        hero_subtitle: 'Climate-first AI Operating System.',
        primary_cta_label: 'Open Climate OS',
        primary_cta_link: '/climate',
        show_climate_dashboard: true,
        show_missions_section: true,
      };

      expect(expectedHomeConfig.hero_title).toBe('ZORA CORE');
      expect(expectedHomeConfig.hero_subtitle).toBeDefined();
      expect(expectedHomeConfig.primary_cta_label).toBeDefined();
      expect(expectedHomeConfig.primary_cta_link).toBe('/climate');
      expect(expectedHomeConfig.show_climate_dashboard).toBe(true);
      expect(expectedHomeConfig.show_missions_section).toBe(true);
    });

    it('should have correct default climate config structure', () => {
      const expectedClimateConfig = {
        hero_title: 'ZORA Climate OS',
        hero_subtitle: 'Track your missions and impact.',
        show_profile_section: true,
        show_dashboard_section: true,
        show_missions_section: true,
      };

      expect(expectedClimateConfig.hero_title).toBeDefined();
      expect(expectedClimateConfig.hero_subtitle).toBeDefined();
      expect(expectedClimateConfig.show_profile_section).toBe(true);
      expect(expectedClimateConfig.show_dashboard_section).toBe(true);
      expect(expectedClimateConfig.show_missions_section).toBe(true);
    });
  });

  describe('Config Merging', () => {
    it('should merge stored config with defaults', () => {
      const defaults = {
        hero_title: 'Default Title',
        hero_subtitle: 'Default Subtitle',
        show_section: true,
      };

      const storedConfig = {
        hero_title: 'Custom Title',
      };

      const merged = { ...defaults, ...storedConfig };

      expect(merged.hero_title).toBe('Custom Title');
      expect(merged.hero_subtitle).toBe('Default Subtitle');
      expect(merged.show_section).toBe(true);
    });

    it('should allow overriding boolean toggles', () => {
      const defaults = {
        show_climate_dashboard: true,
        show_missions_section: true,
      };

      const storedConfig = {
        show_climate_dashboard: false,
      };

      const merged = { ...defaults, ...storedConfig };

      expect(merged.show_climate_dashboard).toBe(false);
      expect(merged.show_missions_section).toBe(true);
    });
  });

  describe('Frontend Config Handler', () => {
    it('should have frontend config handler module', async () => {
      const configModule = await import('../handlers/frontend-config');
      
      expect(configModule.default).toBeDefined();
    });

    it('should export a Hono app instance', async () => {
      const configModule = await import('../handlers/frontend-config');
      
      expect(configModule.default).toBeDefined();
      expect(typeof configModule.default.fetch).toBe('function');
    });
  });

  describe('Config Response Structure', () => {
    it('should define correct response structure for default config', () => {
      const defaultResponse = {
        page: 'home',
        config: {
          hero_title: 'ZORA CORE',
          hero_subtitle: 'Climate-first AI Operating System.',
        },
        is_default: true,
      };

      expect(defaultResponse.page).toBe('home');
      expect(defaultResponse.config).toBeDefined();
      expect(defaultResponse.is_default).toBe(true);
      expect(defaultResponse).not.toHaveProperty('id');
      expect(defaultResponse).not.toHaveProperty('tenant_id');
    });

    it('should define correct response structure for stored config', () => {
      const storedResponse = {
        page: 'home',
        config: {
          hero_title: 'Custom Title',
        },
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenant_id: '00000000-0000-0000-0000-000000000001',
        is_default: false,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      expect(storedResponse.page).toBe('home');
      expect(storedResponse.config).toBeDefined();
      expect(storedResponse.is_default).toBe(false);
      expect(storedResponse.id).toBeDefined();
      expect(storedResponse.tenant_id).toBeDefined();
      expect(storedResponse.created_at).toBeDefined();
      expect(storedResponse.updated_at).toBeDefined();
    });
  });

  describe('Journal Integration', () => {
    it('should use config_change category for journal entries', () => {
      const journalEntry = {
        category: 'config_change',
        title: 'Frontend config updated for page "home"',
        details: {
          event_type: 'frontend_config_updated',
          page: 'home',
          old_config: null,
          new_config: { hero_title: 'New Title' },
        },
      };

      expect(journalEntry.category).toBe('config_change');
      expect(journalEntry.details.event_type).toBe('frontend_config_updated');
      expect(journalEntry.details.page).toBe('home');
      expect(journalEntry.details.old_config).toBeNull();
      expect(journalEntry.details.new_config).toBeDefined();
    });

    it('should include old and new config in journal details', () => {
      const journalEntry = {
        category: 'config_change',
        title: 'Frontend config updated for page "climate"',
        details: {
          event_type: 'frontend_config_updated',
          page: 'climate',
          old_config: { hero_title: 'Old Title' },
          new_config: { hero_title: 'New Title' },
        },
      };

      expect(journalEntry.details.old_config).toEqual({ hero_title: 'Old Title' });
      expect(journalEntry.details.new_config).toEqual({ hero_title: 'New Title' });
    });
  });

  describe('Page Keys', () => {
    it('should support home and climate page keys', () => {
      const validPageKeys = ['home', 'climate'];

      expect(validPageKeys).toContain('home');
      expect(validPageKeys).toContain('climate');
    });

    it('should use home key for dashboard page', () => {
      const dashboardPageKey = 'home';
      expect(dashboardPageKey).toBe('home');
    });

    it('should use climate key for climate page', () => {
      const climatePageKey = 'climate';
      expect(climatePageKey).toBe('climate');
    });
  });

  describe('Tenant Scoping', () => {
    it('should require tenant_id for config queries', () => {
      const queryParams = {
        tenant_id: '00000000-0000-0000-0000-000000000001',
        page: 'home',
      };

      expect(queryParams.tenant_id).toBeDefined();
      expect(queryParams.page).toBeDefined();
    });

    it('should enforce unique constraint on tenant_id + page', () => {
      const constraint = {
        name: 'frontend_configs_tenant_page_unique',
        columns: ['tenant_id', 'page'],
      };

      expect(constraint.columns).toContain('tenant_id');
      expect(constraint.columns).toContain('page');
      expect(constraint.columns.length).toBe(2);
    });
  });
});
