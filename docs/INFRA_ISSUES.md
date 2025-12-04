# Infrastructure Issues - ZORA CORE

This document tracks known infrastructure and CI/CD issues that are outside the scope of code changes but may affect deployments and builds.

## Current Status

As of Backend Hardening v1, the Workers API code builds successfully locally with TypeScript compilation passing.

## Known Issues

### 1. Pre-existing CI Failures (Not Related to Backend Hardening v1)

Some CI jobs have been failing on previous PRs due to infrastructure configuration issues:

| Job | Status | Description |
|-----|--------|-------------|
| CodeQL | Intermittent failures | Security scanning sometimes times out |
| zora/zora1 | Failing | Cloudflare Workers deployment configuration issue |
| Python builds | Intermittent | Python test environment setup issues |

These failures are pre-existing and not related to the Backend Hardening v1 changes.

### 2. Cloudflare Workers Deployment

The Workers API requires the following environment variables to be configured in Cloudflare:

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `ZORA_JWT_SECRET` | JWT signing secret | Yes |
| `OPENAI_API_KEY` | OpenAI API key for embeddings | Optional |
| `ANTHROPIC_API_KEY` | Anthropic API key | Optional |

If these are not configured, the Workers will fail at runtime.

### 3. Vercel Deployment

The frontend deployment on Vercel requires:

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_ZORA_API_BASE_URL` | Workers API URL | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |

## Build Verification

### Workers API (Local)

To verify the Workers API builds locally:

```bash
cd workers/api
npm install
npx tsc --noEmit
```

Expected result: No TypeScript errors.

### Frontend (Local)

To verify the frontend builds locally:

```bash
cd frontend
npm install
npm run build
```

Expected result: Build completes successfully.

## Recommendations

### Short-term

1. Ensure all required environment variables are configured in Cloudflare and Vercel
2. Monitor CI jobs for intermittent failures and retry as needed
3. Document any new environment variables added in future iterations

### Long-term

1. Set up proper CI/CD pipeline with environment variable validation
2. Add pre-deployment checks for required configuration
3. Implement health checks that verify external dependencies
4. Consider using Cloudflare Workers secrets management for sensitive values

## Troubleshooting

### Workers Not Starting

If Workers fail to start, check:

1. All required environment variables are set
2. Supabase project is accessible
3. JWT secret is configured

### Frontend Build Failures

If frontend build fails, check:

1. All `NEXT_PUBLIC_*` variables are set
2. API URL is accessible
3. No TypeScript errors in the codebase

### Database Connection Issues

If database connections fail:

1. Verify Supabase URL and keys are correct
2. Check Supabase project status
3. Ensure RLS policies allow the operation

## Contact

For infrastructure issues that cannot be resolved through code changes, contact the ZORA CORE team or check the deployment platform documentation.
