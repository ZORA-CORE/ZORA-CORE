# ADR-000: Monorepo Architecture for ZORA CORE

- Status: Accepted
- Date: 2024-05-15

## Context

ZORA CORE operates across multiple Nordic and international markets with strict localization, accessibility, and security requirements. A single repository must coordinate edge-rendered frontends, an API, Cloudflare Workers, and a CMS while enabling automated CI/CD and Terraform-managed infrastructure.

## Decision

Adopt a PNPM-powered turborepo monorepo. Shared packages provide configuration, design tokens, UI primitives, i18n utilities, and authentication helpers. Applications include Next.js frontends (public web and admin), a Fastify API, Cloudflare Workers for geo-routing, and a Sanity Studio. Infrastructure code resides beside application code to enable GitOps workflows.

## Consequences

- Easier dependency sharing and consistent linting across apps via workspace packages.
- Coordinated release process through GitHub Actions pipelines defined in repo.
- Terraform modules cover Cloudflare, Vercel, database, Redis, and object storage resources.
- Complexity increases for onboarding; README and runbooks mitigate this.
