# ZORA Agent Automation v1

This document describes how to set up and use the automated agent runtime for ZORA CORE. With Agent Automation v1, pending tasks in the `agent_tasks` queue are processed automatically via GitHub Actions, without requiring manual CLI execution or user login.

## Overview

Agent Automation v1 uses a GitHub Actions workflow to run the Agent Runtime on a schedule. This allows agents to process tasks automatically in the background, making the system truly autonomous.

### How It Works

1. Tasks are created via the Agent Control Center (`/admin/agents/tasks`) or API
2. GitHub Actions runs the Agent Runtime every 15 minutes (configurable)
3. The runtime fetches pending tasks, processes them, and updates their status
4. Results are logged to the journal and EIVOR memory for audit

## GitHub Actions Workflow

The workflow is defined in `.github/workflows/agent-runtime-cron.yml`.

### Schedule

By default, the workflow runs every 15 minutes:

```yaml
schedule:
  - cron: '*/15 * * * *'
```

To change the schedule, edit the cron expression. Common examples:
- `*/15 * * * *` - Every 15 minutes (default)
- `*/30 * * * *` - Every 30 minutes
- `0 * * * *` - Every hour
- `0 */6 * * *` - Every 6 hours

### Manual Trigger

You can also trigger the workflow manually from the GitHub Actions UI:

1. Go to **Actions** > **ZORA Agent Runtime (Scheduled)**
2. Click **Run workflow**
3. Optionally configure:
   - `limit` - Maximum tasks to process (default: 20)
   - `max_seconds` - Maximum runtime in seconds (default: 300)
   - `max_failures` - Maximum failures before aborting (default: 5)
   - `verbose` - Enable verbose logging (default: false)

## Required GitHub Secrets

Configure these secrets in your GitHub repository settings (**Settings** > **Secrets and variables** > **Actions**):

| Secret | Required | Description |
|--------|----------|-------------|
| `SUPABASE_URL` | Yes | Your Supabase project URL (e.g., `https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key (from Project Settings > API) |
| `ZORA_TENANT_ID` | Yes | UUID of the tenant to process tasks for |
| `OPENAI_API_KEY` | Optional | OpenAI API key for LLM reasoning |
| `ANTHROPIC_API_KEY` | Optional | Anthropic API key for Claude models |
| `GOOGLE_API_KEY` | Optional | Google API key for Gemini models |

### Finding Your Tenant ID

1. Go to `/admin/setup` and authenticate with your admin secret
2. Select your tenant from the list
3. The tenant ID is shown in the tenant details

Or query directly from Supabase:
```sql
SELECT id, name FROM tenants;
```

## CLI Flags

The Agent Runtime CLI supports these flags for controlling execution:

```bash
python -m zora_core.autonomy.cli run-once \
  --limit=20 \           # Max tasks to process (default: 10)
  --max-seconds=300 \    # Max runtime in seconds (default: no limit)
  --max-failures=5 \     # Max failures before aborting (default: 5)
  --verbose              # Enable verbose logging
```

### Default Values

| Flag | Default | Description |
|------|---------|-------------|
| `--limit` | 10 | Maximum number of tasks to process per run |
| `--max-seconds` | None | Maximum runtime in seconds (no limit by default) |
| `--max-failures` | 5 | Stop if this many tasks fail consecutively |
| `--verbose` | False | Enable debug-level logging |

### GitHub Actions Defaults

When running via GitHub Actions (scheduled), these defaults are used:
- `limit`: 20
- `max_seconds`: 300 (5 minutes)
- `max_failures`: 5

## Safety & Limits

The automation includes several safety mechanisms:

1. **Concurrency Control** - Only one workflow run at a time (prevents task conflicts)
2. **Time Limit** - Workflow times out after 10 minutes
3. **Task Limit** - Maximum 20 tasks per run by default
4. **Failure Limit** - Stops after 5 consecutive failures
5. **Graceful Exit** - Returns success (exit 0) if no tasks to process

## Monitoring & Debugging

### Viewing Logs

1. Go to **Actions** > **ZORA Agent Runtime (Scheduled)**
2. Click on a workflow run
3. Expand the **Run Agent Runtime** step to see detailed logs

### Common Issues

**"Missing required secrets"**
- Ensure `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and `ZORA_TENANT_ID` are configured

**"Runtime not configured"**
- Check that secrets are correctly set and not empty

**"Max failures reached"**
- Review the logs to see which tasks failed and why
- Check agent implementations for bugs

**No tasks processed**
- Verify tasks exist with status `pending` for your tenant
- Check the tenant ID matches your configured secret

## Integration with Agent Control Center

The Agent Control Center at `/admin/agents/tasks` shows:
- A status indicator showing automation is enabled
- Task queue counts (pending, in_progress, completed, failed)
- Ability to create new tasks that will be processed automatically

Tasks created via the UI are picked up by the next scheduled run (within 15 minutes by default).

## Disabling Automation

To disable automatic task processing:

1. Go to **Actions** > **ZORA Agent Runtime (Scheduled)**
2. Click the **...** menu
3. Select **Disable workflow**

To re-enable, follow the same steps and select **Enable workflow**.

## Related Documentation

- [AGENT_RUNTIME_V1.md](./AGENT_RUNTIME_V1.md) - Agent Runtime architecture and task types
- [AUTONOMY_LAYER_V0.md](./AUTONOMY_LAYER_V0.md) - Agent suggestion system
- [DEVELOPER_SETUP.md](./DEVELOPER_SETUP.md) - Development environment setup
