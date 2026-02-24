# Backup and Recovery Runbook

This repository now includes automated backup/export and restore tooling for MongoDB.

## What was added

- Backup export script: `backend/scripts/backup_mongodb_to_gcs.py`
- Restore script: `backend/scripts/restore_mongodb_from_backup.py`
- Terraform infrastructure:
  - GCS backup bucket
  - Cloud Run Job for database export
  - Cloud Scheduler cron trigger
  - IAM service accounts for backup runner and scheduler
- GitHub Actions cron workflow:
  - `.github/workflows/scheduled-db-export.yml`

## 1) Backup export (manual run)

```bash
cd backend
python3 scripts/backup_mongodb_to_gcs.py
```

Required env vars:

- `MONGO_URL`
- `BACKUP_BUCKET`

Optional:

- `DB_NAME` (default: `dsg_transport`)
- `BACKUP_PREFIX` (default: `mongo-backups/<db_name>`)
- `BACKUP_RETENTION_DAYS` (default: `30`)

## 2) Restore from backup

```bash
cd backend
python3 scripts/restore_mongodb_from_backup.py
```

Required env vars:

- `MONGO_URL`
- `BACKUP_BUCKET`
- `BACKUP_OBJECT` (GCS object path to backup archive)

Optional:

- `DB_NAME` (default: `dsg_transport`)
- `RESTORE_DROP_EXISTING=true` (drop collection before import)

## 3) Provision scheduled backup infrastructure (Terraform)

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

Key values to set in `terraform.tfvars`:

- `project_id`
- `backup_bucket_name`
- `backup_job_image`
- `mongo_url_secret_id`
- `backup_cron`

## 4) Recommended cadence and retention

- Schedule: daily at 02:15 UTC (`15 2 * * *`)
- Retention: 30 days (configurable via Terraform and runtime env)
- Keep test restores in non-production at least monthly

## 5) GitHub Actions scheduler fallback

If you prefer GitHub-hosted cron over Cloud Scheduler, configure these and enable
`.github/workflows/scheduled-db-export.yml`:

- Repository Variables:
  - `BACKUP_MONGO_SECRET_ID` (Secret Manager secret containing MongoDB URI)
  - `BACKUP_BUCKET`
  - Optional: `BACKUP_MONGO_SECRET_VERSION`, `BACKUP_DB_NAME`, `BACKUP_PREFIX`, `BACKUP_RETENTION_DAYS`
