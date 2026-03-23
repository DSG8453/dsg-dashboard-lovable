from typing import Optional


def _credential_value_provided(value: Optional[str]) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return value.strip() != ""
    return True


def merge_tool_credentials(existing_credentials: Optional[dict], incoming_credentials: Optional[dict]) -> Optional[dict]:
    if not incoming_credentials:
        return existing_credentials

    merged_credentials = dict(existing_credentials or {})

    for field, value in incoming_credentials.items():
        if _credential_value_provided(value):
            merged_credentials[field] = value

    return merged_credentials or None
