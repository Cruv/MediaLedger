import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, HttpUrl


class ServerCreate(BaseModel):
    name: str
    server_type: str  # 'emby' or 'jellyfin'
    base_url: str
    api_key: str
    poll_interval_sec: int = 10


class ServerUpdate(BaseModel):
    name: Optional[str] = None
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    is_active: Optional[bool] = None
    poll_interval_sec: Optional[int] = None


class ServerResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    server_type: str
    base_url: str
    is_active: bool
    poll_interval_sec: int
    server_id: Optional[str] = None
    server_version: Optional[str] = None
    last_seen_at: Optional[datetime] = None
    created_at: datetime


class ServerTestResult(BaseModel):
    success: bool
    server_name: Optional[str] = None
    server_id: Optional[str] = None
    version: Optional[str] = None
    error: Optional[str] = None
