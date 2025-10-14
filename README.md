# ZORA CORE Monorepo

Principal engineer blueprint for multi-market, multi-brand deployment across the Nordic region.

## Monorepo layout

```
apps/           # Next.js web + admin, Fastify API, Cloudflare Worker, Sanity Studio
packages/       # Shared UI, design tokens, config, i18n, auth helpers, content loaders
content/        # Market-specific MDX seeds
infra/          # Terraform modules and environment states
.github/        # GitHub Actions, CODEOWNERS, branch policies
Docs/           # ADRs, runbooks
```

## Getting started

1. Install [pnpm](https://pnpm.io/) >= 8 and [Terraform](https://www.terraform.io/).
2. Install dependencies: `pnpm install`.
3. Run local development:
   - `pnpm --filter @zoracore/web dev`
   - `pnpm --filter @zoracore/api dev`
   - `pnpm --filter @zoracore/worker dev` (requires Wrangler)
   - `pnpm --filter @zoracore/studio dev`
4. Execute tests: `pnpm test`.
5. Terraform plan: `cd infra/terraform/envs/staging && ./plan.sh`.

## Deploying to staging & production

1. Configure GitHub environment secrets for `staging` and `prod`:
   - `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ZONE_ID_*`, `CLOUDFLARE_DNS_*`
   - `VERCEL_TOKEN`, `VERCEL_TEAM`, `VERCEL_ORG_ID`, `VERCEL_WEB_PROJECT_ID`, `VERCEL_ADMIN_PROJECT_ID`
   - `PLANETSCALE_ORG` (or Neon equivalent) and any additional provider credentials referenced in Terraform.
2. Trigger the reusable deployment workflow directly via **Actions → Deploy Web** for ad-hoc environment deploys.
3. For coordinated multi-market releases, run **Actions → Global Launch**, which:
   - Deploys staging with infrastructure changes and Vercel preview builds.
   - Pauses for manual approval before promoting to production.
   - Applies Terraform and redeploys the web/admin apps to production.
4. Follow the detailed checklist in `docs/runbooks/global-launch.md` for verification and rollback procedures.

## Security baseline

- CSP, HSTS, TLS 1.3, HTTP/3 enforced in Cloudflare modules and Worker.
- Auth kit uses passkeys via WebAuthn and OAuth helpers in `@zoracore/auth`.
- GitHub workflows run CodeQL, ZAP, and unit/contract tests on every change.

## Launch checklist

- [ ] DNS propagated & HTTPS valid on all TLDs
- [ ] Geo-routing + manual sprogskifter verificeret
- [ ] Lighthouse >= 90 performance, accessibility >= 90
- [ ] WCAG AA audits pass
- [ ] Security headers pass (Mozilla Observatory A)
- [ ] Backups & rollbacks testet
- [ ] Incident runbook opdateret (`docs/runbooks/incidents.md`)
- [ ] Brand QA pr. land (fonte, farver, billeder)
- [ ] Legal pages pr. land (privacy, cookies, terms)

## Manual next steps

- Register Cloudflare as authoritative nameserver for all markets.
- Configure GitHub OIDC trust relationships for Terraform providers.
- Provision Sanity project ID and dataset, update `apps/studio/sanity.config.ts`.
- Add Vercel project and environment secrets for `@zoracore/web` and `@zoracore/admin`.
