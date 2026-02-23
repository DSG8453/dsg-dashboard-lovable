output "backup_bucket" {
  description = "GCS bucket used for backup artifacts"
  value       = google_storage_bucket.db_backups.name
}

output "backup_job_name" {
  description = "Cloud Run backup job name"
  value       = google_cloud_run_v2_job.mongodb_backup.name
}

output "backup_scheduler_job_name" {
  description = "Cloud Scheduler job name for backup trigger"
  value       = google_cloud_scheduler_job.mongodb_backup_schedule.name
}

output "backup_runner_service_account" {
  description = "Service account used by Cloud Run backup job"
  value       = google_service_account.backup_runner.email
}
