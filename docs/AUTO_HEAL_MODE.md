# Auto-Heal Mode

This repository includes an automated remediation workflow:

- `.github/workflows/auto-heal-failed-workflows.yml`

## What it does

For these workflows on `main`:

- `Deploy Backend to GCP Cloud Run`
- `Purge Cloudflare Cache`
- `Scheduled MongoDB Export Backup`
- `Security Posture Checks`

When a run fails:

1. **First failure attempt** (`run_attempt == 1`): auto-rerun once.
2. **If still failing after rerun** (`run_attempt > 1`): open/update an incident issue.
3. **On later success**: close matching incident issue automatically.

## Why this is safe

- Only runs on `main`.
- Ignores `pull_request` workflow runs.
- Limits automatic remediation to a single rerun.

## Manual follow-up

If an incident issue is created, review logs and fix root cause:

```bash
gh run list --repo DSG8453/dsg-dashboard-2026 --limit 20
gh run view <RUN_ID> --repo DSG8453/dsg-dashboard-2026 --log
```
