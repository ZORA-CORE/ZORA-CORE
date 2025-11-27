# Incident Runbook

## Goals
- Restore service across all markets within agreed SLAs.
- Maintain audit trail for regulatory reporting.

## Checklist
1. Identify impacted domains via Cloudflare analytics.
2. Trigger status update via zoracore.app admin console.
3. Engage on-call engineer and localization lead.
4. Run `infra/terraform/envs/<env>/plan.sh` to validate infra state.
5. If rollback is required, redeploy previous Vercel/Worker release via GitHub Actions `deploy_web.yml` workflow.
6. Document timeline and mitigations in this runbook and Sanity "Announcement Bar" entry.
