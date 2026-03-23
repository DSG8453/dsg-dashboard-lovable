from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from routes.tools import ToolCredentials, _merge_tool_credentials


def test_merge_tool_credentials_ignores_empty_values():
    existing_credentials = {
        "username": "stored-user",
        "password": "stored-pass",
        "notes": "keep me",
    }

    incoming_credentials = ToolCredentials(
        username="",
        password=None,
        notes="   ",
    )

    assert _merge_tool_credentials(existing_credentials, incoming_credentials) == existing_credentials


def test_merge_tool_credentials_updates_only_non_empty_fields():
    existing_credentials = {
        "username": "stored-user",
        "password": "stored-pass",
        "login_url": "https://old.example.com",
    }

    incoming_credentials = ToolCredentials(
        username="",
        password="new-pass",
        login_url="https://new.example.com",
    )

    assert _merge_tool_credentials(existing_credentials, incoming_credentials) == {
        "username": "stored-user",
        "password": "new-pass",
        "login_url": "https://new.example.com",
    }


def test_merge_tool_credentials_does_not_apply_unset_defaults():
    existing_credentials = {
        "username": "stored-user",
        "username_field": "email",
        "password_field": "secret",
    }

    incoming_credentials = ToolCredentials(password="new-pass")

    assert _merge_tool_credentials(existing_credentials, incoming_credentials) == {
        "username": "stored-user",
        "username_field": "email",
        "password_field": "secret",
        "password": "new-pass",
    }
