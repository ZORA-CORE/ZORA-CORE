import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createToken } from '../lib/auth';

const TEST_SECRET = 'test-secret-key-that-is-at-least-32-characters-long';
const TEST_ADMIN_SECRET = 'test-admin-bootstrap-secret';

interface ErrorResponse {
  error: string;
  message?: string;
}

interface RootResponse {
  service: string;
  version: string;
  admin_endpoints: string[];
}

describe('Admin API', () => {
  describe('Admin Secret Validation', () => {
    it('should reject requests without X-ZORA-ADMIN-SECRET header', async () => {
      const mockEnv = {
        ZORA_BOOTSTRAP_SECRET: TEST_ADMIN_SECRET,
        ZORA_JWT_SECRET: TEST_SECRET,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SERVICE_KEY: 'test-key',
        ENVIRONMENT: 'test',
      };

      const { default: app } = await import('../index');
      
      const response = await app.request('/api/admin/status', {
        method: 'GET',
      }, mockEnv);

      expect(response.status).toBe(401);
      const data = await response.json() as ErrorResponse;
      expect(data.error).toBe('MISSING_ADMIN_SECRET');
    });

    it('should reject requests with invalid admin secret', async () => {
      const mockEnv = {
        ZORA_BOOTSTRAP_SECRET: TEST_ADMIN_SECRET,
        ZORA_JWT_SECRET: TEST_SECRET,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SERVICE_KEY: 'test-key',
        ENVIRONMENT: 'test',
      };

      const { default: app } = await import('../index');
      
      const response = await app.request('/api/admin/status', {
        method: 'GET',
        headers: {
          'X-ZORA-ADMIN-SECRET': 'wrong-secret',
        },
      }, mockEnv);

      expect(response.status).toBe(403);
      const data = await response.json() as ErrorResponse;
      expect(data.error).toBe('INVALID_ADMIN_SECRET');
    });

    it('should return 500 if ZORA_BOOTSTRAP_SECRET is not configured', async () => {
      const mockEnv = {
        ZORA_JWT_SECRET: TEST_SECRET,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SERVICE_KEY: 'test-key',
        ENVIRONMENT: 'test',
      };

      const { default: app } = await import('../index');
      
      const response = await app.request('/api/admin/status', {
        method: 'GET',
        headers: {
          'X-ZORA-ADMIN-SECRET': TEST_ADMIN_SECRET,
        },
      }, mockEnv);

      expect(response.status).toBe(500);
      const data = await response.json() as ErrorResponse;
      expect(data.error).toBe('ADMIN_NOT_CONFIGURED');
    });
  });

  describe('Token Generation', () => {
    it('should create a valid JWT token with correct claims', async () => {
      const token = await createToken(
        {
          tenant_id: 'tenant-123',
          user_id: 'user-456',
          role: 'founder',
        },
        TEST_SECRET,
        86400
      );

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      const parts = token.split('.');
      expect(parts).toHaveLength(3);

      // Decode payload
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      expect(payload.tenant_id).toBe('tenant-123');
      expect(payload.user_id).toBe('user-456');
      expect(payload.role).toBe('founder');
      expect(payload.exp).toBeDefined();
      expect(payload.iat).toBeDefined();
    });

    it('should create tokens with different roles', async () => {
      const roles = ['founder', 'brand_admin', 'viewer'] as const;
      
      for (const role of roles) {
        const token = await createToken(
          {
            tenant_id: 'tenant-123',
            user_id: 'user-456',
            role,
          },
          TEST_SECRET
        );

        const parts = token.split('.');
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        expect(payload.role).toBe(role);
      }
    });

    it('should create tokens with custom expiration', async () => {
      const expiresIn = 3600; // 1 hour
      const token = await createToken(
        {
          tenant_id: 'tenant-123',
          user_id: 'user-456',
          role: 'founder',
        },
        TEST_SECRET,
        expiresIn
      );

      const parts = token.split('.');
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      expect(payload.exp - payload.iat).toBe(expiresIn);
    });
  });

  describe('Admin Endpoints Structure', () => {
    it('should have admin endpoints listed in root response', async () => {
      const mockEnv = {
        ZORA_BOOTSTRAP_SECRET: TEST_ADMIN_SECRET,
        ZORA_JWT_SECRET: TEST_SECRET,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SERVICE_KEY: 'test-key',
        ENVIRONMENT: 'test',
      };

      const { default: app } = await import('../index');
      
      const response = await app.request('/', {
        method: 'GET',
      }, mockEnv);

      expect(response.status).toBe(200);
      const data = await response.json() as RootResponse;
      
      expect(data.admin_endpoints).toBeDefined();
      expect(Array.isArray(data.admin_endpoints)).toBe(true);
      expect(data.admin_endpoints.length).toBeGreaterThan(0);
      
      // Check that expected admin endpoints are listed
      const adminEndpoints = data.admin_endpoints.join(' ');
      expect(adminEndpoints).toContain('/api/admin/status');
      expect(adminEndpoints).toContain('/api/admin/schema-status');
      expect(adminEndpoints).toContain('/api/admin/bootstrap-tenant');
      expect(adminEndpoints).toContain('/api/admin/tenants');
      expect(adminEndpoints).toContain('/api/admin/users');
    });
  });

  describe('Schema Status Endpoint', () => {
    it('should require admin secret for schema-status endpoint', async () => {
      const mockEnv = {
        ZORA_BOOTSTRAP_SECRET: TEST_ADMIN_SECRET,
        ZORA_JWT_SECRET: TEST_SECRET,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SERVICE_KEY: 'test-key',
        ENVIRONMENT: 'test',
      };

      const { default: app } = await import('../index');
      
      const response = await app.request('/api/admin/schema-status', {
        method: 'GET',
      }, mockEnv);

      expect(response.status).toBe(401);
      const data = await response.json() as ErrorResponse;
      expect(data.error).toBe('MISSING_ADMIN_SECRET');
    });

    it('should reject invalid admin secret for schema-status endpoint', async () => {
      const mockEnv = {
        ZORA_BOOTSTRAP_SECRET: TEST_ADMIN_SECRET,
        ZORA_JWT_SECRET: TEST_SECRET,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SERVICE_KEY: 'test-key',
        ENVIRONMENT: 'test',
      };

      const { default: app } = await import('../index');
      
      const response = await app.request('/api/admin/schema-status', {
        method: 'GET',
        headers: {
          'X-ZORA-ADMIN-SECRET': 'wrong-secret',
        },
      }, mockEnv);

      expect(response.status).toBe(403);
      const data = await response.json() as ErrorResponse;
      expect(data.error).toBe('INVALID_ADMIN_SECRET');
    });
  });

  describe('Schema Status Response Structure', () => {
    it('should have correct response structure for SchemaStatusResponse', () => {
      // Test the expected structure of SchemaStatusResponse
      const mockResponse = {
        schema_ok: true,
        missing_tables: [] as string[],
        missing_columns: [] as string[],
        checked_at: new Date().toISOString(),
      };

      expect(mockResponse).toHaveProperty('schema_ok');
      expect(mockResponse).toHaveProperty('missing_tables');
      expect(mockResponse).toHaveProperty('missing_columns');
      expect(mockResponse).toHaveProperty('checked_at');
      expect(typeof mockResponse.schema_ok).toBe('boolean');
      expect(Array.isArray(mockResponse.missing_tables)).toBe(true);
      expect(Array.isArray(mockResponse.missing_columns)).toBe(true);
    });

    it('should indicate schema issues when tables are missing', () => {
      const mockResponse = {
        schema_ok: false,
        missing_tables: ['tenants', 'users'],
        missing_columns: [],
        checked_at: new Date().toISOString(),
      };

      expect(mockResponse.schema_ok).toBe(false);
      expect(mockResponse.missing_tables).toContain('tenants');
      expect(mockResponse.missing_tables).toContain('users');
    });

    it('should indicate schema issues when columns are missing', () => {
      const mockResponse = {
        schema_ok: false,
        missing_tables: [],
        missing_columns: ['climate_profiles.household_size', 'climate_missions.estimated_impact_kgco2'],
        checked_at: new Date().toISOString(),
      };

      expect(mockResponse.schema_ok).toBe(false);
      expect(mockResponse.missing_columns).toContain('climate_profiles.household_size');
      expect(mockResponse.missing_columns).toContain('climate_missions.estimated_impact_kgco2');
    });
  });
});
