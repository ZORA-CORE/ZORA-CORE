# Auth System v2 - Email + Password Authentication

## Overview

Auth System v2 replaces the previous JWT token paste flow with a proper email + password authentication system using secure HTTP-only cookies for session management.

## Key Features

- Email + password sign-up and login
- Secure HTTP-only cookies for session tokens
- Automatic token refresh (access token: 15 min, refresh token: 30 days)
- Backward compatibility with JWT token login (legacy)
- Multi-tenant support with automatic tenant creation on signup

## Architecture

### Backend (Cloudflare Workers)

#### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Create new account with email + password |
| `/api/auth/login` | POST | Login with email + password |
| `/api/auth/logout` | POST | Logout and clear session |
| `/api/auth/refresh` | POST | Refresh access token using refresh token |
| `/api/auth/me` | GET | Get current authenticated user |

#### Session Management

Sessions are stored in the `auth_sessions` table with the following structure:

- `id`: Unique session ID
- `tenant_id`: Associated tenant
- `user_id`: Associated user
- `refresh_token_hash`: SHA-256 hash of the refresh token
- `expires_at`: Session expiration timestamp
- `revoked_at`: Timestamp when session was revoked (null if active)
- `user_agent`: Client user agent string
- `ip_address`: Client IP address
- `created_at`: Session creation timestamp

#### Cookie Configuration

| Cookie | Max Age | Flags |
|--------|---------|-------|
| `zora_access_token` | 15 minutes | HttpOnly, Secure (prod), SameSite=Lax |
| `zora_refresh_token` | 30 days | HttpOnly, Secure (prod), SameSite=Lax |

### Frontend (Next.js)

#### Pages

- `/login` - Email + password login form (with legacy JWT token option)
- `/signup` - Email + password registration form

#### AuthContext

The `AuthContext` provides authentication state and methods:

```typescript
interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => boolean;        // Legacy JWT login
  loginEmail: (input: LoginInput) => Promise<AuthResponse>;  // Email login
  register: (input: RegisterInput) => Promise<AuthResponse>; // Email signup
  logout: () => Promise<void>;              // Logout
  refreshUser: () => Promise<void>;         // Refresh user data
  getRoleDisplay: () => string;
}
```

#### API Client

All API requests include `credentials: 'include'` to send cookies with cross-origin requests.

## User Roles

| Role | Description |
|------|-------------|
| `founder` | Full system access, can manage all tenants |
| `brand_admin` | Can manage their tenant's data |
| `viewer` | Read-only access to their tenant's data |

## Tenant Creation

- **First user in system**: Becomes `founder` of the default tenant
- **Subsequent users**: Each gets their own tenant as `brand_admin`

## CORS Configuration

The API supports credentials from these origins:

- `http://localhost:3000` (development)
- `http://localhost:8787` (local Workers)
- `https://zora-core.vercel.app` (production)
- `https://zoracore.com` (production)
- `https://*.vercel.app` (preview deployments)

## Migration from v1

### For Existing Users

Existing users created via the admin bootstrap flow can continue using JWT token login (legacy option on login page) or can be migrated to email + password by:

1. Creating a password for their account via admin tools
2. Using the email + password login flow

### For New Users

New users should use the `/signup` page to create an account with email + password.

## Security Considerations

1. **Password Hashing**: Passwords are hashed using bcrypt with cost factor 10
2. **Token Storage**: Refresh tokens are stored as SHA-256 hashes in the database
3. **Cookie Security**: Cookies are HttpOnly (not accessible via JavaScript) and Secure in production
4. **Session Revocation**: Logout revokes the session in the database
5. **Rate Limiting**: Auth endpoints have rate limiting to prevent brute force attacks

## Database Schema

The `auth_sessions` table is added to `SUPABASE_SCHEMA_V1_FULL.sql`:

```sql
CREATE TABLE IF NOT EXISTS auth_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    user_agent TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Environment Variables

No new environment variables are required. The system uses existing:

- `ZORA_JWT_SECRET` - For signing JWT access tokens
- `SUPABASE_URL` - Database connection
- `SUPABASE_SERVICE_ROLE_KEY` - Database authentication

## Testing

1. **Sign Up**: Visit `/signup`, enter email + password, verify account creation
2. **Login**: Visit `/login`, enter credentials, verify redirect to dashboard
3. **Session Persistence**: Refresh page, verify user remains logged in
4. **Logout**: Click logout, verify cookies are cleared and user is redirected
5. **Token Refresh**: Wait 15+ minutes, verify automatic token refresh works

## Future Improvements

- Email verification on signup
- Password reset flow
- OAuth providers (Google, GitHub)
- Two-factor authentication
- Session management UI (view/revoke active sessions)
