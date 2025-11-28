import { describe, it, expect } from 'vitest';
import { AGENTS, getAgentById, isValidAgentId } from '../handlers/agents';

describe('Agents Handler', () => {
  describe('AGENTS constant', () => {
    it('should have 6 agents', () => {
      expect(AGENTS).toHaveLength(6);
    });

    it('should have all required agent IDs', () => {
      const agentIds = AGENTS.map((a) => a.id);
      expect(agentIds).toContain('connor');
      expect(agentIds).toContain('lumina');
      expect(agentIds).toContain('eivor');
      expect(agentIds).toContain('oracle');
      expect(agentIds).toContain('aegis');
      expect(agentIds).toContain('sam');
    });

    it('should have required fields for each agent', () => {
      for (const agent of AGENTS) {
        expect(agent).toHaveProperty('id');
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('role');
        expect(agent).toHaveProperty('description');
        expect(agent).toHaveProperty('pronouns');
        expect(agent).toHaveProperty('color');
      }
    });

    it('should have unique agent IDs', () => {
      const agentIds = AGENTS.map((a) => a.id);
      const uniqueIds = new Set(agentIds);
      expect(uniqueIds.size).toBe(agentIds.length);
    });
  });

  describe('getAgentById', () => {
    it('should return agent for valid ID', () => {
      const agent = getAgentById('connor');
      expect(agent).toBeDefined();
      expect(agent?.name).toBe('CONNOR');
    });

    it('should return agent for uppercase ID', () => {
      const agent = getAgentById('CONNOR');
      expect(agent).toBeDefined();
      expect(agent?.name).toBe('CONNOR');
    });

    it('should return undefined for invalid ID', () => {
      const agent = getAgentById('invalid');
      expect(agent).toBeUndefined();
    });

    it('should return correct agent for each ID', () => {
      expect(getAgentById('connor')?.name).toBe('CONNOR');
      expect(getAgentById('lumina')?.name).toBe('LUMINA');
      expect(getAgentById('eivor')?.name).toBe('EIVOR');
      expect(getAgentById('oracle')?.name).toBe('ORACLE');
      expect(getAgentById('aegis')?.name).toBe('AEGIS');
      expect(getAgentById('sam')?.name).toBe('SAM');
    });
  });

  describe('isValidAgentId', () => {
    it('should return true for valid agent IDs', () => {
      expect(isValidAgentId('connor')).toBe(true);
      expect(isValidAgentId('lumina')).toBe(true);
      expect(isValidAgentId('eivor')).toBe(true);
      expect(isValidAgentId('oracle')).toBe(true);
      expect(isValidAgentId('aegis')).toBe(true);
      expect(isValidAgentId('sam')).toBe(true);
    });

    it('should return false for invalid agent IDs', () => {
      expect(isValidAgentId('invalid')).toBe(false);
      expect(isValidAgentId('')).toBe(false);
      expect(isValidAgentId('CONNOR')).toBe(true); // case insensitive
    });
  });
});
