#!/usr/bin/env python3
"""
Restore MongoDB collections from a backup archive stored in GCS.

Required environment variables:
  - MONGO_URL
  - BACKUP_BUCKET
  - BACKUP_OBJECT (example: mongo-backups/dsg_transport/dsg_transport-20260101T020000Z.tar.gz)

Optional environment variables:
  - DB_NAME (default: dsg_transport)
  - RESTORE_DROP_EXISTING (default: false)
"""

from __future__ import annotations

import gzip
import logging
import os
import tarfile
import tempfile
from pathlib import Path
from typing import Iterable, List

from bson import json_util
from google.cloud import storage
from pymongo import MongoClient


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
LOGGER = logging.getLogger("mongodb-restore")


def get_required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ValueError(f"Missing required environment variable: {name}")
    return value


def chunked(items: Iterable[dict], size: int) -> Iterable[List[dict]]:
    batch: List[dict] = []
    for item in items:
        batch.append(item)
        if len(batch) >= size:
            yield batch
            batch = []
    if batch:
        yield batch


def read_ndjson(path: Path) -> Iterable[dict]:
    with gzip.open(path, "rt", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            yield json_util.loads(line)

def safe_extract(tar: tarfile.TarFile, target_dir: Path) -> None:
    target_dir_resolved = target_dir.resolve()
    for member in tar.getmembers():
        member_path = (target_dir / member.name).resolve()
        if not str(member_path).startswith(str(target_dir_resolved)):
            raise RuntimeError(f"Unsafe archive path detected: {member.name}")
    tar.extractall(path=target_dir)


def restore() -> int:
    mongo_url = get_required_env("MONGO_URL")
    backup_bucket = get_required_env("BACKUP_BUCKET")
    backup_object = get_required_env("BACKUP_OBJECT")
    db_name = os.getenv("DB_NAME", "dsg_transport")
    drop_existing = os.getenv("RESTORE_DROP_EXISTING", "false").lower() == "true"

    storage_client = storage.Client()
    blob = storage_client.bucket(backup_bucket).blob(backup_object)

    if not blob.exists():
        raise FileNotFoundError(f"Backup object not found: gs://{backup_bucket}/{backup_object}")

    with tempfile.TemporaryDirectory(prefix="mongodb-restore-") as temp_dir:
        temp_path = Path(temp_dir)
        archive_file = temp_path / "backup.tar.gz"
        blob.download_to_filename(str(archive_file))

        extract_dir = temp_path / "extract"
        extract_dir.mkdir(parents=True, exist_ok=True)
        with tarfile.open(archive_file, mode="r:gz") as tar:
            safe_extract(tar, extract_dir)

        backup_root_candidates = [path for path in extract_dir.iterdir() if path.is_dir()]
        if not backup_root_candidates:
            raise RuntimeError("Backup archive did not contain an export directory")
        backup_root = backup_root_candidates[0]

        client = MongoClient(mongo_url, serverSelectionTimeoutMS=15000)
        client.admin.command("ping")
        database = client[db_name]

        restored_total = 0
        for collection_file in sorted(backup_root.glob("*.ndjson.gz")):
            collection_name = collection_file.name.replace(".ndjson.gz", "")
            collection = database[collection_name]

            if drop_existing:
                collection.drop()
                LOGGER.info("Dropped existing collection before restore: %s", collection_name)

            inserted = 0
            for batch in chunked(read_ndjson(collection_file), 500):
                if batch:
                    result = collection.insert_many(batch, ordered=False)
                    inserted += len(result.inserted_ids)

            LOGGER.info("Restored %s documents into %s", inserted, collection_name)
            restored_total += inserted

        client.close()
        return restored_total


if __name__ == "__main__":
    try:
        total = restore()
        LOGGER.info("Restore completed successfully. Documents restored: %s", total)
    except Exception as exc:
        LOGGER.exception("Restore failed: %s", exc)
        raise SystemExit(1) from exc
