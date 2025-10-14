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
