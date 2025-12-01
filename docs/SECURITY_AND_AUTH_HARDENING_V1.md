# Security & Auth Hardening v1.0

This document describes the security and authentication hardening features implemented in ZORA CORE as part of Iteration 00D0.

## Overview

Security & Auth Hardening v1.0 adds several layers of protection to the ZORA CORE authentication system:

1. **Account Lockout** - Prevents brute force attacks by locking accounts after repeated failed login attempts
2. **Password Reset Flow** - Secure token-based password reset with one-time use tokens
3. **Email Verification** - Token-based email verification for user accounts
4. **Rate Limiting** - In-memory rate limiting for critical endpoints to prevent abuse

## Schema Changes (v3.1.0)

### New Columns on `users` Table

| Column | Type | Description |
|--------|------|-------------|
| `email_verified_at` | TIMESTAMPTZ | Timestamp when email was verified, NULL if not verified |
| `failed_login_attempts` | INTEGER | Consecutive failed login attempts since last success (default: 0) |
| `locked_until` | TIMESTAMPTZ | Account locked until this timestamp, NULL if not locked |

### New Tables

#### `auth_password_reset_tokens`

Stores hashed password reset tokens for secure password recovery.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Foreign key to tenants |
| `user_id` | UUID | Foreign key to users |
| `token_hash` | TEXT | SHA-256 hash of the reset token |
| `expires_at` | TIMESTAMPTZ | Token expiration (1 hour from creation) |
| `used_at` | TIMESTAMPTZ | When token was used, NULL if unused |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

#### `auth_email_verification_tokens`

Stores hashed email verification tokens.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Foreign key to tenants |
| `user_id` | UUID | Foreign key to users |
| `token_hash` | TEXT | SHA-256 hash of the verification token |
| `expires_at` | TIMESTAMPTZ | Token expiration (24 hours from creation) |
| `used_at` | TIMESTAMPTZ | When token was used, NULL if unused |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

Both tables have RLS policies that allow service role access only (sensitive security data).

## Account Lockout

### Behavior

When a user fails to log in:
1. The `failed_login_attempts` counter is incremented
2. After reaching the threshold (default: 5 attempts), the account is locked
3. The `locked_until` timestamp is set to the current time plus the lockout duration (default: 15 minutes)
4. Subsequent login attempts return a 423 (Locked) status with the remaining lockout time

When a user successfully logs in:
1. The `failed_login_attempts` counter is reset to 0
2. The `locked_until` timestamp is cleared

### Configuration

Configure via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_MAX_FAILED_ATTEMPTS` | 5 | Number of failed attempts before lockout |
| `AUTH_LOCKOUT_DURATION_MINUTES` | 15 | Duration of account lockout in minutes |

### API Response Examples

**Failed login (attempts remaining):**
```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid display name or password. 3 attempt(s) remaining before account lockout."
  }
}
```

**Account locked:**
```json
{
  "error": {
    "code": "ACCOUNT_LOCKED",
    "message": "Account is locked due to too many failed login attempts. Try again in 12 minute(s)."
  }
}
```

## Password Reset Flow

### Endpoints

#### POST /api/auth/password/forgot

Request a password reset token.

**Request:**
```json
{
  "display_name": "username"
}
```

**Response (always returns success to prevent user enumeration):**
```json
{
  "message": "If an account with that display name exists, a password reset link has been sent."
}
```

In development mode (`ZORA_ENV=development`), the response includes `_dev_token` for testing.

#### POST /api/auth/password/reset

Reset password using a valid token.

**Request:**
```json
{
  "token": "the-reset-token",
  "new_password": "newSecurePassword123"
}
```

**Response:**
```json
{
  "message": "Password has been reset successfully. You can now log in with your new password."
}
```

### Token Security

- Tokens are generated using `crypto.getRandomValues()` (32 bytes = 256 bits of entropy)
- Only the SHA-256 hash is stored in the database
- Tokens expire after 1 hour
- Tokens can only be used once
- Password reset also clears any account lockout

## Email Verification Flow

### Endpoints

#### POST /api/auth/email/verify-request (requires authentication)

Request an email verification token.

**Response:**
```json
{
  "message": "Verification email has been sent."
}
```

In development mode, the response includes `_dev_token` for testing.

#### POST /api/auth/email/verify

Verify email using a valid token.

**Request:**
```json
{
  "token": "the-verification-token"
}
```

**Response:**
```json
{
  "message": "Email has been verified successfully."
}
```

### Token Security

- Same security model as password reset tokens
- Tokens expire after 24 hours
- Tokens can only be used once
- Verification status is stored in `users.email_verified_at`

### Checking Verification Status

The `GET /api/auth/me` endpoint now includes `email_verified_at` in the response:

```json
{
  "user": {
    "id": "...",
    "email_verified_at": "2024-01-15T10:30:00Z"
  }
}
```

## Rate Limiting

### Overview

Rate limiting is implemented using an in-memory Map-based approach. This provides protection against abuse while being simple to deploy. For high-availability production deployments, consider upgrading to KV-based rate limiting.

### Rate-Limited Endpoints

| Endpoint | Limit | Window | Purpose |
|----------|-------|--------|---------|
| `POST /api/auth/login` | 10 requests | 1 minute | Prevent brute force attacks |
| `POST /api/auth/register` | 5 requests | 1 minute | Prevent spam registrations |
| `POST /api/auth/password/forgot` | 5 requests | 1 hour | Prevent email spam |
| `POST /api/agents/commands` | 60 requests | 1 minute | Prevent command flooding |
| `POST /api/shop/orders` | 10 requests | 1 minute | Prevent order spam |
| `/api/billing/webhooks/*` | 100 requests | 1 minute | Allow payment provider callbacks |

### Response Headers

All rate-limited endpoints include these headers:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests allowed in the window |
| `X-RateLimit-Remaining` | Requests remaining in current window |
| `X-RateLimit-Reset` | Unix timestamp when the window resets |

### Rate Limit Exceeded Response

When rate limit is exceeded, the API returns HTTP 429:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again in 45 second(s)."
  }
}
```

The response includes a `Retry-After` header with the number of seconds to wait.

### Configuration

Rate limits can be configured via environment variables (future enhancement). Current limits are hardcoded but can be easily adjusted in the middleware configuration.

## Debugging Guide

### Locked Account

If a user's account is locked:

1. **Wait for lockout to expire** - The lockout duration is 15 minutes by default
2. **Use password reset** - Resetting the password also clears the lockout
3. **Admin intervention** - An admin can manually clear the lockout by updating the user record:
   ```sql
   UPDATE users 
   SET failed_login_attempts = 0, locked_until = NULL 
   WHERE display_name = 'username';
   ```

### Rate Limit Issues

If a user is being rate limited:

1. **Check the `Retry-After` header** - This tells you how long to wait
2. **Check the `X-RateLimit-*` headers** - These show the current limit status
3. **Wait for the window to reset** - Rate limits reset automatically

### Token Issues

If a password reset or email verification token isn't working:

1. **Check expiration** - Password reset tokens expire after 1 hour, email verification after 24 hours
2. **Check if already used** - Tokens can only be used once
3. **Request a new token** - If the token is expired or used, request a new one

## Security Considerations

### Token Hashing

All tokens are hashed using SHA-256 before storage. This means:
- The raw token is never stored in the database
- Even if the database is compromised, tokens cannot be recovered
- Each token can only be validated by the user who received it

### User Enumeration Prevention

The password reset endpoint always returns a success message, even if the user doesn't exist. This prevents attackers from discovering valid usernames.

### Rate Limiting Limitations

The current in-memory rate limiting has some limitations:
- Resets when the worker restarts
- Not shared across multiple worker instances
- For production, consider upgrading to Cloudflare KV or Durable Objects

### RLS Policies

Both token tables use Row Level Security with service-role-only access. This ensures:
- Regular users cannot query token tables
- Only the API (using service role) can manage tokens
- Tokens are isolated by tenant

## Future Enhancements

Potential improvements for future iterations:

1. **Email Integration** - Actually send emails with reset/verification links
2. **KV-Based Rate Limiting** - Use Cloudflare KV for distributed rate limiting
3. **2FA/MFA** - Add two-factor authentication support
4. **Session Management** - Track and manage active sessions
5. **Audit Logging** - Enhanced security event logging
6. **IP Blocking** - Automatic IP blocking for repeated abuse
