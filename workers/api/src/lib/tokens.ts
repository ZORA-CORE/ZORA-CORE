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
} as const;

/**
 * Calculate expiry timestamp from now
 */
export function getExpiryTimestamp(durationMs: number): string {
  return new Date(Date.now() + durationMs).toISOString();
}
