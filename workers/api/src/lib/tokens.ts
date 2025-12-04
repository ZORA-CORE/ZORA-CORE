/**
 * Token utilities for password reset and email verification
 * 
 * Uses crypto.subtle for SHA-256 hashing (Web Crypto API available in Workers)
 * Tokens are generated as random bytes and hashed before storage
 */

/**
 * Generate a secure random token (32 bytes = 256 bits of entropy)
 * Returns the token as a URL-safe base64 string
 */
export async function generateToken(): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return arrayBufferToBase64Url(bytes);
}

/**
 * Hash a token using SHA-256
 * Returns the hash as a hex string for storage
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return arrayBufferToHex(hashBuffer);
}

/**
 * Generate a token and return both the raw token (to send to user) and hash (to store)
 */
export async function generateTokenPair(): Promise<{ token: string; tokenHash: string }> {
  const token = await generateToken();
  const tokenHash = await hashToken(token);
  return { token, tokenHash };
}

/**
 * Convert ArrayBuffer to hex string
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert Uint8Array to URL-safe base64 string
 */
function arrayBufferToBase64Url(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Token expiry durations (in milliseconds)
 */
export const TOKEN_EXPIRY = {
  PASSWORD_RESET: 60 * 60 * 1000, // 1 hour
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000, // 24 hours
  ACCESS_TOKEN: 15 * 60 * 1000, // 15 minutes
  REFRESH_TOKEN: 30 * 24 * 60 * 60 * 1000, // 30 days
} as const;

/**
 * Cookie configuration for auth tokens
 */
export const COOKIE_CONFIG = {
  ACCESS_TOKEN_NAME: 'zora_access_token',
  REFRESH_TOKEN_NAME: 'zora_refresh_token',
  ACCESS_TOKEN_MAX_AGE: 15 * 60, // 15 minutes in seconds
  REFRESH_TOKEN_MAX_AGE: 30 * 24 * 60 * 60, // 30 days in seconds
} as const;

/**
 * Calculate expiry timestamp from now
 */
export function getExpiryTimestamp(durationMs: number): string {
  return new Date(Date.now() + durationMs).toISOString();
}

/**
 * Build a Set-Cookie header value for auth cookies
 * @param name Cookie name
 * @param value Cookie value
 * @param maxAge Max age in seconds
 * @param isProduction Whether running in production (affects Secure and SameSite)
 */
export function buildCookieHeader(
  name: string,
  value: string,
  maxAge: number,
  isProduction: boolean
): string {
  const parts = [
    `${name}=${value}`,
    `Path=/`,
    `HttpOnly`,
    `Max-Age=${maxAge}`,
  ];

  if (isProduction) {
    parts.push('Secure');
    parts.push('SameSite=None');
  } else {
    parts.push('SameSite=Lax');
  }

  return parts.join('; ');
}

/**
 * Build a Set-Cookie header to clear/expire a cookie
 */
export function buildClearCookieHeader(name: string, isProduction: boolean): string {
  const parts = [
    `${name}=`,
    `Path=/`,
    `HttpOnly`,
    `Max-Age=0`,
    `Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
  ];

  if (isProduction) {
    parts.push('Secure');
    parts.push('SameSite=None');
  } else {
    parts.push('SameSite=Lax');
  }

  return parts.join('; ');
}

/**
 * Parse cookies from Cookie header string
 */
export function parseCookies(cookieHeader: string | null | undefined): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  const cookies: Record<string, string> = {};
  const pairs = cookieHeader.split(';');

  for (const pair of pairs) {
    const [name, ...valueParts] = pair.trim().split('=');
    if (name) {
      cookies[name.trim()] = valueParts.join('=').trim();
    }
  }

  return cookies;
}
