/**
 * JWT Authentication utilities for ZORA CORE API
 * 
 * Uses HMAC-SHA256 (HS256) for JWT signing/verification.
 * Implements JWT verification using Web Crypto API (no external dependencies).
 */

export interface JWTPayload {
  tenant_id: string;
  user_id: string;
  role: 'founder' | 'brand_admin' | 'viewer';
  iat: number;  // Issued at (Unix timestamp)
  exp: number;  // Expiration (Unix timestamp)
}

export interface AuthContext {
  tenantId: string;
  userId: string;
  role: 'founder' | 'brand_admin' | 'viewer';
}

export class AuthError extends Error {
  public code: string;
  public status: number;

  constructor(code: string, message: string, status: number = 401) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Base64URL encode a string or ArrayBuffer
 */
function base64UrlEncode(data: string | ArrayBuffer): string {
  let base64: string;
  if (typeof data === 'string') {
    base64 = btoa(data);
  } else {
    const bytes = new Uint8Array(data);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    base64 = btoa(binary);
  }
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Base64URL decode to string
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

/**
 * Import HMAC key for JWT operations
 */
async function importKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Create HMAC-SHA256 signature
 */
async function sign(data: string, secret: string): Promise<string> {
  const key = await importKey(secret);
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return base64UrlEncode(signature);
}

/**
 * Verify HMAC-SHA256 signature
 */
async function verify(data: string, signature: string, secret: string): Promise<boolean> {
  const key = await importKey(secret);
  const encoder = new TextEncoder();
  
  // Decode the signature from base64url
  let base64 = signature.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const sigBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  
  return crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(data));
}

/**
 * Create a JWT token
 */
export async function createToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  secret: string,
  expiresInSeconds: number = 86400 // 24 hours default
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(fullPayload));
  
  const dataToSign = `${headerEncoded}.${payloadEncoded}`;
  const signature = await sign(dataToSign, secret);
  
  return `${dataToSign}.${signature}`;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string, secret: string): Promise<JWTPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new AuthError('INVALID_TOKEN', 'Invalid token format');
  }

  const [headerEncoded, payloadEncoded, signature] = parts;
  const dataToVerify = `${headerEncoded}.${payloadEncoded}`;

  // Verify signature
  const isValid = await verify(dataToVerify, signature, secret);
  if (!isValid) {
    throw new AuthError('INVALID_SIGNATURE', 'Token signature verification failed');
  }

  // Decode and parse payload
  let payload: JWTPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadEncoded));
  } catch {
    throw new AuthError('INVALID_PAYLOAD', 'Failed to decode token payload');
  }

  // Validate required fields
  if (!payload.tenant_id || !payload.user_id || !payload.role) {
    throw new AuthError('INVALID_PAYLOAD', 'Token missing required fields');
  }

  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new AuthError('TOKEN_EXPIRED', 'Token has expired');
  }

  return payload;
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader: string | null): string {
  if (!authHeader) {
    throw new AuthError('MISSING_TOKEN', 'Authorization header is required');
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new AuthError('INVALID_AUTH_HEADER', 'Authorization header must use Bearer scheme');
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    throw new AuthError('MISSING_TOKEN', 'Token is empty');
  }

  return token;
}

/**
 * Verify Authorization header and return auth context
 */
export async function verifyAuthHeader(
  authHeader: string | null,
  secret: string
): Promise<AuthContext> {
  const token = extractToken(authHeader);
  const payload = await verifyToken(token, secret);
  
  return {
    tenantId: payload.tenant_id,
    userId: payload.user_id,
    role: payload.role,
  };
}

/**
 * Check if user has required role
 */
export function hasRole(
  context: AuthContext,
  requiredRoles: Array<'founder' | 'brand_admin' | 'viewer'>
): boolean {
  return requiredRoles.includes(context.role);
}

/**
 * Check if user can write (founder or brand_admin)
 */
export function canWrite(context: AuthContext): boolean {
  return hasRole(context, ['founder', 'brand_admin']);
}

/**
 * Check if user is founder
 */
export function isFounder(context: AuthContext): boolean {
  return context.role === 'founder';
}
