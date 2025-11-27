# Global Launch Runbook

This runbook walks through the steps required to promote the ZORA CORE platform from staging to the full multi-market production release. Follow the checklist carefully and document every approval in the incident log.

## Prerequisites

1. **Secrets configured** (GitHub environment secrets for both `staging` and `prod`):
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_ZONE_ID_STAGING` / `CLOUDFLARE_ZONE_ID_PROD`
   - `CLOUDFLARE_DNS_STAGING` / `CLOUDFLARE_DNS_PROD` (JSON list of DNS records)
   - `VERCEL_TOKEN`
   - `VERCEL_TEAM`
   - `VERCEL_ORG_ID`
   - `VERCEL_WEB_PROJECT_ID`
   - `VERCEL_ADMIN_PROJECT_ID`
   - `PLANETSCALE_ORG`
   - Any additional provider credentials (Upstash, R2, Neon) referenced in Terraform.
2. **Terraform remote backend** configured (Terraform Cloud or alternative) and accessible via GitHub OIDC.
3. **Sanity / CMS project IDs** and environment variables synced in Vercel.
4. **All required approvals** (security, legal, localization) recorded in `docs/adr` or `docs/runbooks`.

## Launch sequence

1. **Verify staging**
   - Run `pnpm install && pnpm turbo run lint test build` locally or rely on CI.
   - Confirm latest commit on `main` has passed `ci_web.yml`, `ci_api.yml`, and `security.yml` workflows.
   - Open https://zoracore.app (staging shell) and perform smoke tests for each locale toggle.

2. **Trigger the `Global Launch` workflow**
   - Navigate to **Actions → Global Launch**.
   - Click **Run workflow**, confirm the `ref` (default `main`), and start.
   - The workflow automatically:
     - Deploys the staging stack via the reusable `deploy_web.yml` workflow.
     - Applies Terraform for staging (Cloudflare, Vercel, PlanetScale, Upstash).
     - Deploys the web and admin apps to Vercel preview environments.

3. **Manual QA gate**
   - When the `Approve production rollout` job pauses, review:
     - Staging sites for each domain alias.
     - Content and theming correctness by market.
     - Security headers via https://securityheaders.com.
   - Approve directly in the workflow UI when ready.

4. **Production deployment**
   - The workflow redeploys infrastructure and applications for production.
   - Monitor the job logs for Terraform apply and Vercel deploy output.
   - Upon success, validate:
     - Cloudflare routing with `dig zoracore.dk` and domain-specific hostnames.
     - Vercel production URLs for `/`, `/shop`, `/legal` routes.
     - API health at `https://api.zoracore.ai/v1/health` (Fastify service).

5. **Post-launch checks**
   - Run Lighthouse audits (desktop + mobile) for representative markets.
   - Confirm Plausible/Umami analytics events and consent flows.
   - Update the launch checklist in `README.md` and archive evidence in the release ticket.
   - Log the deployment in `docs/runbooks/incidents.md` (even if no incident) with timestamps.

## Rollback procedure

- Re-run `Global Launch` pointing to the previous stable git tag.
- Or invoke `deploy_web.yml` manually with `environment=prod` and the rollback commit.
- For infrastructure regressions, execute `terraform destroy -target` commands for misbehaving resources (requires SRE approval).
- Update Cloudflare DNS to point back to the prior deployment aliases if Vercel rollback is insufficient.

## Contact matrix

- **Engineering on-call**: `@zoracore/platform` (GitHub team, receives pager alerts).
- **Localization lead**: `localization@zoracore.ai` for copy escalations.
- **Security**: `security@zoracore.ai` for WAF or policy overrides.

Document any deviations from this runbook in the incident log and raise ADR updates when the process changes.
