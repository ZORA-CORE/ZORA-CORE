# Auth Backend v1.0 Documentation

**Iteration:** 00B1  
**Date:** 2025-11-28  
**Schema Version:** 1.9.0

## Overview

Auth Backend v1.0 implements proper username/password authentication for ZORA CORE, moving away from the developer-centric "paste JWT" flow to a normal app-level authentication system. This iteration adds:

- Password-based registration and login endpoints
- Secure password hashing using bcrypt
- Clear user/tenant/role models with account types
- Extended admin APIs for user management
- JWT tokens that include role and account_type

## User Model

The `users` table now includes the following fields:

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Foreign key to tenants |
| email | VARCHAR(255) | User email (can be auto-generated) |
| display_name | VARCHAR(255) | User's display name (used for login) |
| role | user_role | One of: founder, brand_admin, member, viewer |
| account_type | TEXT | One of: private, company |
| password_hash | TEXT | Bcrypt-hashed password (nullable) |
| metadata | JSONB | Additional user metadata |
| last_login_at | TIMESTAMPTZ | Last login timestamp |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### Roles

- **founder**: Full control over the tenant, can manage all users and settings
- **brand_admin**: Can manage brands, products, and climate profiles
- **member**: Standard user with read/write access to most features
- **viewer**: Read-only access

### Account Types

- **private**: Individual user account
- **company**: Organization or brand account

## Tenant Model

The `tenants` table now includes:

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(255) | Tenant name |
| slug | VARCHAR(100) | URL-friendly identifier |
| description | TEXT | Tenant description |
| tenant_type | TEXT | One of: private, company |
| metadata | JSONB | Additional tenant metadata |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

## API Endpoints

### Public Endpoints (No Auth Required)

#### POST /api/auth/register

Creates a new tenant and founder user with password authentication.

**Request Body:**
```json
{
  "display_name": "John Doe",
  "account_type": "private",
  "password": "securepassword123"
}
```

**Response (201 Created):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "display_name": "John Doe",
    "account_type": "private",
    "role": "founder",
    "tenant_id": "uuid"
  }
}
```

**Validation:**
- `display_name` is required and must be unique
- `password` must be at least 8 characters
- `account_type` defaults to "private" if not provided

#### POST /api/auth/login

Authenticates a user with display_name and password.

**Request Body:**
```json
{
  "display_name": "John Doe",
  "password": "securepassword123"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "display_name": "John Doe",
    "account_type": "private",
    "role": "founder",
    "tenant_id": "uuid"
  }
}
```

**Error Responses:**
- 401: Invalid credentials
- 401: Password not set (user must use admin token flow)

### Authenticated Endpoints

#### GET /api/auth/me

Returns the current user and tenant information based on the JWT token.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "uuid",
    "tenant_id": "uuid",
    "email": "user@example.com",
    "display_name": "John Doe",
    "role": "founder",
    "account_type": "private",
    "last_login_at": "2025-11-28T12:00:00Z",
    "created_at": "2025-11-28T10:00:00Z"
  },
  "tenant": {
    "id": "uuid",
    "name": "John Doe",
    "slug": "john-doe-1732800000000",
    "tenant_type": "private",
    "description": "Tenant for John Doe",
    "created_at": "2025-11-28T10:00:00Z"
  }
}
```

### Admin Endpoints (Requires X-ZORA-ADMIN-SECRET)

#### GET /api/admin/users

Lists users with optional filtering.

**Query Parameters:**
- `tenant_id` (optional): Filter by tenant
- `role` (optional): Filter by role (founder, brand_admin, member, viewer)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "email": "user@example.com",
      "display_name": "John Doe",
      "role": "founder",
      "account_type": "private",
      "last_login_at": "2025-11-28T12:00:00Z",
      "created_at": "2025-11-28T10:00:00Z",
      "updated_at": null
    }
  ]
}
```

#### POST /api/admin/users

Creates a new user with optional password.

**Request Body:**
```json
{
  "tenant_id": "uuid",
  "display_name": "Jane Smith",
  "role": "member",
  "account_type": "private",
  "password": "optionalpassword123",
  "email": "jane@example.com"
}
```

**Required Fields:**
- `tenant_id`
- `display_name`
- `role`

**Optional Fields:**
- `password` (if provided, must be at least 8 characters)
- `account_type` (defaults to "private")
- `email` (auto-generated if not provided)

**Response (201 Created):**
```json
{
  "data": {
    "id": "uuid",
    "tenant_id": "uuid",
    "email": "jane@example.com",
    "display_name": "Jane Smith",
    "role": "member",
    "account_type": "private",
    "last_login_at": null,
    "created_at": "2025-11-28T12:00:00Z",
    "updated_at": null
  }
}
```

## JWT Payload

JWT tokens now include the following claims:

```json
{
  "tenant_id": "uuid",
  "user_id": "uuid",
  "role": "founder",
  "account_type": "private",
  "iat": 1732800000,
  "exp": 1733404800
}
```

- Tokens expire after 7 days by default
- The `account_type` field is optional but included when available

## Password Security

- Passwords are hashed using bcrypt with 10 rounds
- Password hashes are never returned in API responses
- Minimum password length is 8 characters
- Users without password_hash can still use the admin token flow

## Migration Guide

### Existing Users

Existing users created before Auth Backend v1.0 will not have a `password_hash` set. They can continue using the admin token flow (`POST /api/admin/users/:id/token`) until a password is set.

### Setting Passwords for Existing Users

To enable password login for existing users, use the admin API to create a new user with a password, or implement a password reset flow (not included in v1.0).

### Database Schema Update

Run the updated `SUPABASE_SCHEMA_V1_FULL.sql` script to add the new columns:

```sql
-- Add account_type column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'private';

-- Add password_hash column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add tenant_type column to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tenant_type TEXT DEFAULT 'private';

-- Add 'member' to user_role enum
ALTER TYPE user_role ADD VALUE 'member';
```

## Journal Events

Auth Backend v1.0 creates the following journal entries:

- `user_registered`: When a new user registers via `/api/auth/register`
- `user_created_by_admin`: When an admin creates a user via `/api/admin/users`

## Error Codes

| Code | Description |
|------|-------------|
| INVALID_JSON | Request body is not valid JSON |
| MISSING_DISPLAY_NAME | display_name is required |
| INVALID_PASSWORD | Password must be at least 8 characters |
| INVALID_ACCOUNT_TYPE | account_type must be private or company |
| USER_EXISTS | A user with this display name already exists |
| INVALID_CREDENTIALS | Invalid display name or password |
| PASSWORD_NOT_SET | User doesn't have password authentication enabled |
| USER_NOT_FOUND | User not found |
| TENANT_NOT_FOUND | Tenant not found |
| JWT_NOT_CONFIGURED | ZORA_JWT_SECRET is not configured |

## Future Improvements

The following features are planned for future iterations:

- Password reset flow
- Email verification
- OAuth/social login integration
- Two-factor authentication
- Session management and token revocation
- Role change endpoint (`POST /api/admin/users/:id/role`)
