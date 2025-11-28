import { describe, it, expect } from 'vitest';
import {
  createToken,
  verifyToken,
  extractToken,
  verifyAuthHeader,
  hasRole,
  canWrite,
  isFounder,
  AuthError,
} from '../lib/auth';

const TEST_SECRET = 'test-secret-key-that-is-at-least-32-characters-long';

describe('JWT Auth Library', () => {
  describe('createToken', () => {
    it('should create a valid JWT token', async () => {
      const token = await createToken(
        {
          tenant_id: 'tenant-123',
          user_id: 'user-456',
          role: 'founder',
        },
        TEST_SECRET
      );

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // JWT format: header.payload.signature
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
    });

    it('should create token with custom expiration', async () => {
      const token = await createToken(
        {
          tenant_id: 'tenant-123',
          user_id: 'user-456',
          role: 'brand_admin',
        },
        TEST_SECRET,
        3600 // 1 hour
      );

      const payload = await verifyToken(token, TEST_SECRET);
      expect(payload.exp - payload.iat).toBe(3600);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      const token = await createToken(
        {
          tenant_id: 'tenant-123',
          user_id: 'user-456',
          role: 'founder',
        },
        TEST_SECRET
      );

      const payload = await verifyToken(token, TEST_SECRET);

      expect(payload.tenant_id).toBe('tenant-123');
      expect(payload.user_id).toBe('user-456');
      expect(payload.role).toBe('founder');
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
    });

    it('should reject token with invalid signature', async () => {
      const token = await createToken(
        {
          tenant_id: 'tenant-123',
          user_id: 'user-456',
          role: 'founder',
        },
        TEST_SECRET
      );

      await expect(verifyToken(token, 'wrong-secret-key-that-is-long-enough')).rejects.toThrow(
        AuthError
      );
    });

    it('should reject malformed token', async () => {
      await expect(verifyToken('not-a-valid-token', TEST_SECRET)).rejects.toThrow(AuthError);
    });

    it('should reject expired token', async () => {
      const token = await createToken(
        {
          tenant_id: 'tenant-123',
          user_id: 'user-456',
          role: 'founder',
        },
        TEST_SECRET,
        -1 // Already expired
      );

      await expect(verifyToken(token, TEST_SECRET)).rejects.toThrow(AuthError);
    });
  });

  describe('extractToken', () => {
    it('should extract token from Bearer header', () => {
      const token = extractToken('Bearer my-jwt-token');
      expect(token).toBe('my-jwt-token');
    });

    it('should throw for missing header', () => {
      expect(() => extractToken(null)).toThrow(AuthError);
    });

    it('should throw for empty header', () => {
      expect(() => extractToken('')).toThrow(AuthError);
    });

    it('should throw for non-Bearer header', () => {
      expect(() => extractToken('Basic credentials')).toThrow(AuthError);
    });

    it('should throw for Bearer without token', () => {
      expect(() => extractToken('Bearer ')).toThrow(AuthError);
    });
  });

  describe('verifyAuthHeader', () => {
    it('should verify valid auth header and return context', async () => {
      const token = await createToken(
        {
          tenant_id: 'tenant-123',
          user_id: 'user-456',
          role: 'founder',
        },
        TEST_SECRET
      );

      const context = await verifyAuthHeader(`Bearer ${token}`, TEST_SECRET);

      expect(context.tenantId).toBe('tenant-123');
      expect(context.userId).toBe('user-456');
      expect(context.role).toBe('founder');
    });

    it('should throw for invalid auth header', async () => {
      await expect(verifyAuthHeader('Invalid header', TEST_SECRET)).rejects.toThrow(AuthError);
    });
  });

  describe('Role helpers', () => {
    const founderContext = { tenantId: 't1', userId: 'u1', role: 'founder' as const };
    const adminContext = { tenantId: 't1', userId: 'u1', role: 'brand_admin' as const };
    const viewerContext = { tenantId: 't1', userId: 'u1', role: 'viewer' as const };

    describe('hasRole', () => {
      it('should return true when user has specified role', () => {
        expect(hasRole(founderContext, ['founder'])).toBe(true);
        expect(hasRole(adminContext, ['brand_admin'])).toBe(true);
        expect(hasRole(viewerContext, ['viewer'])).toBe(true);
      });

      it('should return false when user does not have specified role', () => {
        expect(hasRole(founderContext, ['viewer'])).toBe(false);
        expect(hasRole(viewerContext, ['founder'])).toBe(false);
      });

      it('should support multiple roles', () => {
        expect(hasRole(founderContext, ['founder', 'brand_admin'])).toBe(true);
        expect(hasRole(adminContext, ['founder', 'brand_admin'])).toBe(true);
        expect(hasRole(viewerContext, ['founder', 'brand_admin'])).toBe(false);
      });
    });

    describe('canWrite', () => {
      it('should return true for founder', () => {
        expect(canWrite(founderContext)).toBe(true);
      });

      it('should return true for brand_admin', () => {
        expect(canWrite(adminContext)).toBe(true);
      });

      it('should return false for viewer', () => {
        expect(canWrite(viewerContext)).toBe(false);
      });
    });

    describe('isFounder', () => {
      it('should return true for founder', () => {
        expect(isFounder(founderContext)).toBe(true);
      });

      it('should return false for brand_admin', () => {
        expect(isFounder(adminContext)).toBe(false);
      });

      it('should return false for viewer', () => {
        expect(isFounder(viewerContext)).toBe(false);
      });
    });
  });
});
