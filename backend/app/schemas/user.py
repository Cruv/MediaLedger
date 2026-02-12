import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class UserTagBrief(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    color: str


class UserResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    server_id: uuid.UUID
    remote_user_id: str
    username: str
    is_admin: bool
    is_disabled: bool
    last_login_at: Optional[datetime] = None
    last_activity_at: Optional[datetime] = None
    # Joined
    server_name: Optional[str] = None
    server_type: Optional[str] = None
    # Computed stats
    total_plays: Optional[int] = None
    total_watch_time_sec: Optional[int] = None
    # Tags
    tags: list[UserTagBrief] = []


class UserDetailResponse(UserResponse):
    devices: list["UserDeviceResponse"] = []
    recent_sessions: list["UserSessionSummary"] = []


class UserDeviceResponse(BaseModel):
    device_name: Optional[str] = None
    device_id: Optional[str] = None
    client_name: Optional[str] = None
    last_seen_at: Optional[datetime] = None
    session_count: int = 0


class UserSessionSummary(BaseModel):
    id: uuid.UUID
    item_title: Optional[str] = None
    item_type: Optional[str] = None
    started_at: datetime
    stopped_at: datetime
    watched_pct: float
    completed: bool
    device_name: Optional[str] = None


class PaginatedUsers(BaseModel):
    items: list[UserResponse]
    total: int
    page: int
    page_size: int
