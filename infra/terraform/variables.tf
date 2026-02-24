variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region used for backup infrastructure"
  type        = string
  default     = "us-central1"
}

variable "backup_bucket_name" {
  description = "GCS bucket name for database backup archives"
  type        = string
}

variable "backup_bucket_location" {
  description = "Location for the backup bucket"
  type        = string
  default     = "US"
}

variable "backup_retention_days" {
  description = "Retention period in days for backups"
  type        = number
  default     = 30
}

variable "backup_job_name" {
  description = "Cloud Run Job name for MongoDB exports"
  type        = string
  default     = "mongodb-export-backup"
}

variable "backup_job_image" {
  description = "Container image URI used by the Cloud Run backup job"
  type        = string
}

variable "mongo_url_secret_id" {
  description = "Secret Manager secret ID that stores the MongoDB URI"
  type        = string
}

variable "mongo_url_secret_version" {
  description = "Secret Manager version for MongoDB URI secret"
  type        = string
  default     = "latest"
}

variable "db_name" {
  description = "MongoDB database name"
  type        = string
  default     = "dsg_transport"
}

variable "backup_prefix" {
  description = "Object prefix within the backup bucket"
  type        = string
  default     = "mongo-backups/dsg_transport"
}

variable "backup_cron" {
  description = "Cloud Scheduler cron expression for database exports"
  type        = string
  default     = "15 2 * * *"
}

variable "backup_time_zone" {
  description = "Time zone for Cloud Scheduler"
  type        = string
  default     = "Etc/UTC"
}
