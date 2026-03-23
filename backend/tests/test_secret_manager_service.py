import os
import sys
from pathlib import Path

import pytest


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.secret_manager_service import SecretManagerService


def test_secret_manager_requires_explicit_project_id(monkeypatch):
    monkeypatch.delenv("GCP_PROJECT_ID", raising=False)

    with pytest.raises(RuntimeError, match="GCP_PROJECT_ID environment variable is required"):
        SecretManagerService()


def test_secret_manager_uses_configured_project_id(monkeypatch):
    monkeypatch.setenv("GCP_PROJECT_ID", "dsg-transport-dashboard")

    service = SecretManagerService()

    assert service.project_id == "dsg-transport-dashboard"
