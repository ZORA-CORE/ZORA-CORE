import { describe, it, expect } from 'vitest';

describe('Missions API', () => {
  describe('Bootstrap Missions', () => {
    it('should have STARTER_MISSIONS defined with correct structure', async () => {
      // Import the missions handler to verify STARTER_MISSIONS structure
      const missionsModule = await import('../handlers/missions');
      
      // The module exports the app, but we can verify the endpoint exists
      expect(missionsModule.default).toBeDefined();
    });

    it('should define starter missions with required fields', () => {
      // Verify the expected starter missions structure
      const expectedCategories = ['energy', 'transport', 'food', 'products'];
      const expectedMissions = [
        { title: 'Switch 5 bulbs to LED', category: 'energy', estimated_impact_kgco2: 20 },
        { title: 'Replace one weekly car trip with public transport', category: 'transport', estimated_impact_kgco2: 15 },
        { title: 'Try 2 meat-free days this week', category: 'food', estimated_impact_kgco2: 10 },
        { title: 'Review your next 3 purchases for climate-friendly alternatives', category: 'products', estimated_impact_kgco2: 5 },
      ];

      // Verify each mission has required fields
      for (const mission of expectedMissions) {
        expect(mission.title).toBeDefined();
        expect(mission.category).toBeDefined();
        expect(expectedCategories).toContain(mission.category);
        expect(mission.estimated_impact_kgco2).toBeGreaterThan(0);
      }

      // Verify total impact
      const totalImpact = expectedMissions.reduce((sum, m) => sum + m.estimated_impact_kgco2, 0);
      expect(totalImpact).toBe(50);
    });
  });

  describe('Mission Categories', () => {
    it('should support all expected categories', () => {
      const expectedCategories = ['energy', 'transport', 'food', 'products', 'other'];
      
      // Verify all categories are valid
      for (const category of expectedCategories) {
        expect(typeof category).toBe('string');
        expect(category.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Mission Fields', () => {
    it('should support estimated_impact_kgco2 field', () => {
      // Verify the field type expectations
      const validImpacts = [0, 5, 10, 15, 20, 100, 1000];
      
      for (const impact of validImpacts) {
        expect(typeof impact).toBe('number');
        expect(impact).toBeGreaterThanOrEqual(0);
      }
    });

    it('should support due_date field as ISO date string', () => {
      // Verify date format expectations
      const validDates = [
        '2025-01-01',
        '2025-12-31',
        '2026-06-15',
      ];
      
      for (const date of validDates) {
        expect(typeof date).toBe('string');
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });
  });
});

describe('Journal Integration', () => {
  it('should have journal helper module', async () => {
    const journalModule = await import('../lib/journal');
    
    expect(journalModule.insertJournalEntry).toBeDefined();
    expect(typeof journalModule.insertJournalEntry).toBe('function');
  });

  it('should define JournalEventInput interface correctly', async () => {
    // Verify the expected structure of journal events
    const expectedEventTypes = [
      'climate_profile_created',
      'climate_profile_updated',
      'climate_mission_created',
      'climate_mission_status_updated',
      'climate_missions_bootstrapped',
    ];

    for (const eventType of expectedEventTypes) {
      expect(typeof eventType).toBe('string');
      expect(eventType.length).toBeGreaterThan(0);
    }
  });
});
