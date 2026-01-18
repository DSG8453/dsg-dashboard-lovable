from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum

class DeviceStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    revoked = "revoked"

class DeviceCreate(BaseModel):
    user_id: str
    user_name: str
    user_email: str
    device_name: str  # Browser + OS
    browser: str
    os: str
    ip_address: str
    user_agent: str
    fingerprint: str  # Unique device identifier

class DeviceUpdate(BaseModel):
    status: DeviceStatus
    admin_note: Optional[str] = None

class DeviceResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    device_name: str
    browser: str
    os: str
    ip_address: str
    status: str
    created_at: str
    approved_at: Optional[str] = None
    approved_by: Optional[str] = None
    last_login: Optional[str] = None
    admin_note: Optional[str] = None
