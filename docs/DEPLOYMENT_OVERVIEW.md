# ZORA CORE Deployment Overview

This guide covers deploying ZORA CORE to production using Cloudflare Workers (API) and Vercel (Frontend).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet                                 │
└─────────────────────────────────────────────────────────────────┘
                    │                           │
                    ▼                           ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│   app.your-domain.com       │   │   api.your-domain.com       │
│         (Vercel)            │   │   (Cloudflare Workers)      │
│                             │   │                             │
│   Next.js Frontend          │──▶│   Hono REST API             │
│   - Dashboard               │   │   - /api/status             │
│   - Climate OS              │   │   - /api/climate/*          │
│   - Agent Dashboards        │   │   - /api/agents/*           │
│   - Login                   │   │   - /api/journal            │
└─────────────────────────────┘   └─────────────────────────────┘
                                              │
                                              ▼
                              ┌─────────────────────────────────┐
                              │         Supabase                │
                              │   (Postgres + pgvector)         │
                              │                                 │
                              │   - tenants, users              │
                              │   - climate_profiles            │
                              │   - climate_missions            │
                              │   - memory_events               │
                              │   - journal_entries             │
                              └─────────────────────────────────┘
```

## Prerequisites

Before deploying, ensure you have:

1. **Supabase Project** - With all migrations applied
2. **Cloudflare Account** - For Workers deployment
3. **Vercel Account** - For frontend deployment
4. **OpenAI API Key** - For semantic search embeddings
5. **Custom Domains** (optional) - For branded URLs

## Part 1: Deploy Workers API to Cloudflare

### Step 1: Install Wrangler CLI

```bash
npm install -g wrangler
```

### Step 2: Authenticate with Cloudflare

```bash
wrangler login
```

This opens a browser for OAuth authentication.

### Step 3: Set Production Secrets

Navigate to the workers/api directory and set each secret:

```bash
cd workers/api

# Supabase credentials
wrangler secret put SUPABASE_URL --env production
# Enter: https://your-project.supabase.co

wrangler secret put SUPABASE_SERVICE_KEY --env production
# Enter: your-service-role-key

# OpenAI for semantic search
wrangler secret put OPENAI_API_KEY --env production
# Enter: sk-your-openai-api-key

# JWT authentication secret (min 32 characters)
wrangler secret put ZORA_JWT_SECRET --env production
# Enter: your-jwt-secret-at-least-32-characters

# Admin bootstrap secret (for /admin/setup page)
wrangler secret put ZORA_BOOTSTRAP_SECRET --env production
# Enter: your-admin-secret-at-least-32-characters
```

### Step 4: Configure Custom Domain (Optional)

Edit `workers/api/wrangler.toml` and uncomment the routes section:

```toml
[env.production]
name = "zora-core-api"
routes = [
  { pattern = "api.your-domain.com/*", zone_name = "your-domain.com" }
]
```

**Note:** Your domain must be added to Cloudflare first.

### Step 5: Deploy

```bash
npm run deploy
# Or explicitly: wrangler deploy --env production
```

### Step 6: Verify Deployment

```bash
# Replace with your Workers URL or custom domain
curl https://zora-core-api.your-account.workers.dev/api/status
```

Expected response:
```json
{
  "service": "ZORA CORE API",
  "version": "0.4.0",
  "environment": "production",
  "supabase": { "connected": true }
}
```

## Part 2: Deploy Frontend to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository (ZORA-CORE/ZORA-CORE)
4. Configure the project:
   - **Framework Preset:** Next.js
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

5. Add Environment Variables:
   - `NEXT_PUBLIC_ZORA_API_BASE_URL` = `https://api.your-domain.com` (your Workers API URL)

6. Click "Deploy"

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to frontend directory
cd frontend

# Deploy (follow prompts)
vercel

# For production deployment
vercel --prod
```

### Step 7: Configure Custom Domain (Optional)

1. In Vercel dashboard, go to your project settings
2. Navigate to "Domains"
3. Add your custom domain (e.g., `app.your-domain.com`)
4. Configure DNS:
   - **Option A:** Use Vercel nameservers
   - **Option B:** Add CNAME record pointing to `cname.vercel-dns.com`

## Part 3: Custom Domain Setup

### API Domain (Cloudflare Workers)

Since your domain is already on Cloudflare (required for Workers routes):

1. DNS is automatically configured when you add the route
2. SSL is handled by Cloudflare
3. No additional DNS configuration needed

### Frontend Domain (Vercel)

**Option A: Vercel Nameservers (Recommended)**
1. In Vercel, add your domain
2. Update your domain registrar to use Vercel nameservers
3. Vercel handles all DNS and SSL

**Option B: External DNS**
1. In Vercel, add your domain
2. Add CNAME record: `app` -> `cname.vercel-dns.com`
3. Vercel handles SSL via Let's Encrypt

### Example DNS Configuration

```
# If using Cloudflare for DNS (API on Cloudflare, Frontend on Vercel)

# API - handled by Cloudflare Workers route
api.your-domain.com -> (Cloudflare Workers)

# Frontend - CNAME to Vercel
app.your-domain.com -> CNAME -> cname.vercel-dns.com
```

## Environment Variables Reference

### Workers API (Cloudflare Secrets)

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_KEY` | Service role key | Yes |
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `ZORA_JWT_SECRET` | JWT signing secret | Yes |
| `ZORA_BOOTSTRAP_SECRET` | Admin bootstrap secret | Yes |

### Frontend (Vercel Environment Variables)

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_ZORA_API_BASE_URL` | Workers API URL | Yes |

## Post-Deployment Checklist

- [ ] API `/api/status` returns healthy response
- [ ] Frontend loads without errors
- [ ] Login page works (can paste JWT token)
- [ ] Climate OS page loads profiles from API
- [ ] Agent Dashboards show memory events
- [ ] Semantic search returns results
- [ ] Custom domains resolve correctly (if configured)

## Troubleshooting

### API Returns 500 Errors

1. Check Cloudflare Workers logs: `wrangler tail --env production`
2. Verify all secrets are set: `wrangler secret list --env production`
3. Test Supabase connection independently

### Frontend Can't Connect to API

1. Verify `NEXT_PUBLIC_ZORA_API_BASE_URL` is set correctly
2. Check for CORS errors in browser console
3. Ensure API is deployed and accessible

### Authentication Errors

1. Verify `ZORA_JWT_SECRET` matches between CLI and Workers
2. Check token expiration
3. Ensure token format is correct (3 parts separated by dots)

### Semantic Search Returns 503

1. Verify `OPENAI_API_KEY` is set
2. Check OpenAI API quota/billing
3. Review Workers logs for specific errors

## Security Recommendations

1. **Rotate Secrets Regularly** - Update JWT secret and API keys periodically
2. **Restrict CORS** - Update Workers to only allow your frontend domain
3. **Enable Rate Limiting** - Add Cloudflare rate limiting rules
4. **Monitor Logs** - Set up alerting for errors and unusual activity
5. **Use Separate Environments** - Consider staging environment for testing

## Related Documentation

- [Developer Setup](./DEVELOPER_SETUP.md) - Local development guide
- [Database Schema](./DATABASE_SCHEMA_v0_1.md) - Database structure
- [JWT Authentication](./STATUS_REPORT_ITERATION_0008.md) - Auth implementation details
- [Workers API README](../workers/api/README.md) - API documentation
- [Frontend README](../frontend/README.md) - Frontend documentation

## Part 4: First-Time Admin Setup

After deploying both the API and frontend, use the Admin Setup page to bootstrap your first tenant and users.

### Step 1: Access Admin Setup

1. Navigate to `https://your-frontend-domain.com/admin/setup`
2. Enter your `ZORA_BOOTSTRAP_SECRET` in the admin secret field
3. Click "Authenticate"

### Step 2: Check System Status

The System Status section shows:
- Whether JWT secret is configured
- Whether bootstrap secret is configured
- Whether Supabase is connected
- Whether tenants and users exist

### Step 3: Bootstrap Tenant (First Time Only)

If no tenants exist:
1. Enter a tenant name (e.g., "ZORA CORE")
2. Enter the founder's email address
3. Click "Bootstrap Tenant"

This creates the default tenant and founder user.

### Step 4: Generate JWT Token

1. In the "Manage Tenants & Users" section, select your tenant
2. Find your user in the list
3. Click "Generate Token"
4. Copy the token

### Step 5: Log In

1. Navigate to `/login`
2. Paste your JWT token
3. Click "Sign in"
4. You now have access to Climate OS, Agents, and Journal

---

*ZORA CORE Deployment Guide - Iteration 0009*
