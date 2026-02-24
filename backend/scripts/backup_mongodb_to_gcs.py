#!/usr/bin/env python3
"""
Export MongoDB collections to compressed NDJSON files and upload the archive to GCS.

Required environment variables:
  - MONGO_URL
  - BACKUP_BUCKET

Optional environment variables:
  - DB_NAME (default: dsg_transport)
  - BACKUP_PREFIX (default: mongo-backups/<db_name>)
  - BACKUP_RETENTION_DAYS (default: 30)
"""

from __future__ import annotations

import gzip
import json
import logging
import os
import tarfile
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, Tuple

from bson import json_util
from google.cloud import storage
from pymongo import MongoClient
from pymongo.collection import Collection


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
LOGGER = logging.getLogger("mongodb-backup")


def get_required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ValueError(f"Missing required environment variable: {name}")
    return value


def export_collection(collection: Collection, output_file: Path) -> int:
    """Export a collection to gzipped NDJSON and return document count."""
    count = 0
    cursor = collection.find({}, no_cursor_timeout=True).batch_size(1000)
    try:
        with gzip.open(output_file, "wt", encoding="utf-8") as handle:
            for document in cursor:
                handle.write(json_util.dumps(document))
                handle.write("\n")
                count += 1
    finally:
        cursor.close()
    return count


def create_archive(source_dir: Path, archive_file: Path) -> None:
    with tarfile.open(archive_file, mode="w:gz") as tar:
        tar.add(source_dir, arcname=source_dir.name)


def upload_archive(
    storage_client: storage.Client,
    bucket_name: str,
    backup_prefix: str,
    archive_file: Path,
    metadata: Dict[str, str],
) -> str:
    normalized_prefix = backup_prefix.strip("/")
    object_path = f"{normalized_prefix}/{archive_file.name}" if normalized_prefix else archive_file.name

    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(object_path)
    blob.metadata = metadata
    blob.upload_from_filename(str(archive_file))
    return f"gs://{bucket_name}/{object_path}"


def prune_old_backups(
    storage_client: storage.Client,
    bucket_name: str,
    backup_prefix: str,
    retention_days: int,
) -> int:
    if retention_days <= 0:
        return 0

    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    normalized_prefix = backup_prefix.strip("/")
    delete_count = 0

    for blob in storage_client.list_blobs(bucket_name, prefix=f"{normalized_prefix}/"):
        created_at = blob.time_created
        if created_at and created_at < cutoff:
            blob.delete()
            delete_count += 1

    return delete_count


def run_backup() -> Tuple[str, int]:
    mongo_url = get_required_env("MONGO_URL")
    backup_bucket = get_required_env("BACKUP_BUCKET")
    db_name = os.getenv("DB_NAME", "dsg_transport")
    backup_prefix = os.getenv("BACKUP_PREFIX", f"mongo-backups/{db_name}")
    retention_days = int(os.getenv("BACKUP_RETENTION_DAYS", "30"))
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    with tempfile.TemporaryDirectory(prefix="mongodb-backup-") as temp_dir:
        temp_path = Path(temp_dir)
        export_dir = temp_path / f"{db_name}-{timestamp}"
        export_dir.mkdir(parents=True, exist_ok=True)

        LOGGER.info("Connecting to MongoDB")
        mongo_client = MongoClient(mongo_url, serverSelectionTimeoutMS=15000)
        mongo_client.admin.command("ping")
        database = mongo_client[db_name]

        collection_counts: Dict[str, int] = {}
        total_documents = 0

        LOGGER.info("Exporting collections from database '%s'", db_name)
        for collection_name in sorted(database.list_collection_names()):
            output_file = export_dir / f"{collection_name}.ndjson.gz"
            count = export_collection(database[collection_name], output_file)
            collection_counts[collection_name] = count
            total_documents += count
            LOGGER.info("Exported %s documents from %s", count, collection_name)

        metadata = {
            "created_at_utc": datetime.now(timezone.utc).isoformat(),
            "database": db_name,
            "total_documents": total_documents,
            "collections": collection_counts,
        }
        metadata_path = export_dir / "metadata.json"
        metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

        archive_file = temp_path / f"{db_name}-{timestamp}.tar.gz"
        create_archive(export_dir, archive_file)

        LOGGER.info("Uploading backup archive to GCS bucket '%s'", backup_bucket)
        storage_client = storage.Client()
        gcs_path = upload_archive(
            storage_client=storage_client,
            bucket_name=backup_bucket,
            backup_prefix=backup_prefix,
            archive_file=archive_file,
            metadata={
                "database": db_name,
                "created_at_utc": metadata["created_at_utc"],
            },
        )

        deleted = prune_old_backups(
            storage_client=storage_client,
            bucket_name=backup_bucket,
            backup_prefix=backup_prefix,
            retention_days=retention_days,
        )
        if deleted:
            LOGGER.info("Deleted %s old backup object(s) using retention policy", deleted)

        mongo_client.close()
        return gcs_path, total_documents


if __name__ == "__main__":
    try:
        destination, document_count = run_backup()
        LOGGER.info("Backup completed successfully: %s (documents exported: %s)", destination, document_count)
    except Exception as exc:
        LOGGER.exception("Backup failed: %s", exc)
        raise SystemExit(1) from exc
