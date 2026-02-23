data "google_project" "current" {
  project_id = var.project_id
}

resource "google_storage_bucket" "db_backups" {
  name                        = var.backup_bucket_name
  location                    = var.backup_bucket_location
  uniform_bucket_level_access = true
  force_destroy               = false

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = var.backup_retention_days
    }
    action {
      type = "Delete"
    }
  }
}

resource "google_service_account" "backup_runner" {
  account_id   = "mongodb-backup-runner"
  display_name = "MongoDB Backup Runner"
}

resource "google_service_account" "backup_scheduler" {
  account_id   = "mongodb-backup-scheduler"
  display_name = "MongoDB Backup Scheduler"
}

resource "google_project_iam_member" "backup_runner_storage_access" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.backup_runner.email}"
}

resource "google_project_iam_member" "scheduler_run_developer" {
  project = var.project_id
  role    = "roles/run.developer"
  member  = "serviceAccount:${google_service_account.backup_scheduler.email}"
}

resource "google_project_iam_member" "scheduler_run_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.backup_scheduler.email}"
}

resource "google_service_account_iam_member" "scheduler_impersonation" {
  service_account_id = google_service_account.backup_scheduler.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-cloudscheduler.iam.gserviceaccount.com"
}

resource "google_cloud_run_v2_job" "mongodb_backup" {
  name     = var.backup_job_name
  location = var.region

  template {
    task_count  = 1
    parallelism = 1

    template {
      service_account = google_service_account.backup_runner.email
      timeout         = "3600s"
      max_retries     = 1

      containers {
        image   = var.backup_job_image
        command = ["python", "scripts/backup_mongodb_to_gcs.py"]

        env {
          name  = "MONGO_URL"
          value = var.mongo_url
        }
        env {
          name  = "DB_NAME"
          value = var.db_name
        }
        env {
          name  = "BACKUP_BUCKET"
          value = google_storage_bucket.db_backups.name
        }
        env {
          name  = "BACKUP_PREFIX"
          value = var.backup_prefix
        }
        env {
          name  = "BACKUP_RETENTION_DAYS"
          value = tostring(var.backup_retention_days)
        }
      }
    }
  }
}

resource "google_cloud_scheduler_job" "mongodb_backup_schedule" {
  name        = "${var.backup_job_name}-schedule"
  description = "Triggers MongoDB export backup job"
  schedule    = var.backup_cron
  time_zone   = var.backup_time_zone
  region      = var.region
  depends_on  = [google_service_account_iam_member.scheduler_impersonation]

  http_target {
    http_method = "POST"
    uri         = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/jobs/${google_cloud_run_v2_job.mongodb_backup.name}:run"

    oauth_token {
      service_account_email = google_service_account.backup_scheduler.email
      scope                 = "https://www.googleapis.com/auth/cloud-platform"
    }
  }
}
