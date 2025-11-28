# Production Deployment Status Guide

This guide explains how to verify that the ZORA CORE production deployments match the latest code in the `main` branch. No CLI tools are required - everything can be done through web UIs.

## Overview

ZORA CORE has two main deployments:

1. **Frontend** - Next.js app deployed on Vercel at https://zoracore.dk
2. **API** - Cloudflare Workers at https://api.zoracore.dk

## Checking Version Info in the App

The easiest way to verify which version is running is to check the version info displayed in the app itself.

### Dashboard Footer

Navigate to https://zoracore.dk/dashboard (requires login). The footer shows:
- Frontend commit hash
- API commit hash
- Current iteration number

### Admin Setup Page

Navigate to https://zoracore.dk/admin/setup and enter your admin secret. The "Version Info" section shows detailed information:

**Frontend:**
- Iteration number
- Git commit hash
- Build timestamp

**API:**
- Version number
- Iteration number
- Git commit hash
- Environment (dev/production)
- Supabase connection status

## Verifying Vercel Deployment (Frontend)

### Step 1: Access Vercel Dashboard

1. Go to https://vercel.com and log in
2. Select the "ZORA CORE's projects" team
3. Click on the "zora-core" project

### Step 2: Check Production Deployment

1. Click on the "Deployments" tab
2. Look for the deployment marked "Production" (has a green badge)
3. The deployment shows:
   - Commit message
   - Commit hash (first 7 characters)
   - Branch name (should be "main")
   - Deployment time

### Step 3: Compare with App

Compare the commit hash shown in Vercel with what you see in the app footer or /admin/setup. They should match.

### Triggering a Manual Redeploy

If the production deployment doesn't match the latest main:

1. Go to the "Deployments" tab
2. Find the most recent deployment from the "main" branch
3. Click the three-dot menu (⋮) on that deployment
4. Select "Promote to Production"

Or, to trigger a fresh build:

1. Go to the "Settings" tab
2. Scroll to "Build & Development Settings"
3. Click "Redeploy" at the top of the page

### Setting Environment Variables

The frontend needs these environment variables:

1. Go to "Settings" → "Environment Variables"
2. Ensure these are set:
   - `NEXT_PUBLIC_ZORA_API_BASE_URL` = `https://api.zoracore.dk`
   - `NEXT_PUBLIC_GIT_COMMIT_SHA` = `$VERCEL_GIT_COMMIT_SHA` (Vercel auto-fills this)
   - `NEXT_PUBLIC_BUILD_TIME` = (optional, set manually or via build script)

## Verifying Cloudflare Workers Deployment (API)

### Step 1: Access Cloudflare Dashboard

1. Go to https://dash.cloudflare.com and log in
2. Select your account
3. Click "Workers & Pages" in the left sidebar

### Step 2: Find the API Worker

1. Look for the Worker that handles api.zoracore.dk
2. Click on it to view details

### Step 3: Check Deployment Status

1. Click on the "Deployments" tab
2. The most recent deployment shows:
   - Deployment time
   - Version/deployment ID
   - Status (Active/Inactive)

### Step 4: Compare with API Status

You can also check the API version directly:

1. Open https://api.zoracore.dk/api/status in your browser
2. The response shows:
   - `api_version`: Current API version
   - `iteration`: Current iteration number
   - `git_commit`: Git commit hash (if configured)
   - `environment`: Should be "production"

### Triggering a Manual Redeploy

If you need to redeploy the API:

1. Go to the Worker's "Settings" tab
2. Click "Edit Code" to open the editor
3. Click "Save and Deploy" to redeploy

Or, if you have GitHub integration set up:

1. Push a new commit to the main branch
2. The GitHub Actions workflow will automatically deploy

### Setting Environment Variables (Secrets)

The API needs these secrets configured:

1. Go to the Worker's "Settings" tab
2. Click "Variables" in the left sidebar
3. Under "Environment Variables", ensure these are set:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_KEY` - Your Supabase service role key
   - `ZORA_JWT_SECRET` - Secret for JWT signing
   - `ZORA_BOOTSTRAP_SECRET` - Admin bootstrap secret
   - `ENVIRONMENT` - Set to "production"
   - `ZORA_API_GIT_COMMIT` - (optional) Current git commit hash
   - `ZORA_API_BUILD_TIME` - (optional) Build timestamp

## Troubleshooting

### Frontend shows old version

1. Check Vercel deployments - is the latest main deployed to production?
2. Clear your browser cache and hard refresh (Ctrl+Shift+R)
3. Check if there's a failed deployment in Vercel

### API shows old version

1. Check Cloudflare Workers deployments
2. Verify the Worker is bound to the correct route
3. Check if there are any errors in the Worker logs

### "API unavailable" in Version Info

1. Check if https://api.zoracore.dk/api/status returns a response
2. Verify CORS is configured correctly
3. Check Cloudflare Workers logs for errors

### Deployment failed

1. Check the deployment logs in Vercel/Cloudflare
2. Common issues:
   - Missing environment variables
   - Build errors (check the build log)
   - TypeScript errors

## What's New Panel

The /admin/setup page includes a "What's New" panel showing the latest iterations. This helps you understand what features should be available in the current version.

## Version Numbering

- **API Version**: Follows semantic versioning (e.g., 0.4.0)
- **Iteration**: Sequential iteration number (e.g., 0016)
- **Git Commit**: First 7 characters of the commit hash

When verifying deployments, the iteration number and git commit are the most reliable indicators that production matches main.
