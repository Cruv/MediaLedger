import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class ActiveSessionResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    server_id: uuid.UUID
    user_id: uuid.UUID
    item_id: Optional[uuid.UUID] = None
    remote_session_id: str
    state: str
    play_method: Optional[str] = None
    device_name: Optional[str] = None
    device_id: Optional[str] = None
    client_name: Optional[str] = None
    ip_address: Optional[str] = None

    @field_validator("ip_address", mode="before")
    @classmethod
    def coerce_ip(cls, v):
        return str(v) if v is not None else None
    position_ticks: int
    runtime_ticks: Optional[int] = None
    started_at: datetime
    last_activity_at: datetime
    # Joined fields
    username: Optional[str] = None
    item_title: Optional[str] = None
    item_type: Optional[str] = None
    server_name: Optional[str] = None


class SessionHistoryResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    server_id: uuid.UUID
    user_id: uuid.UUID
    item_id: Optional[uuid.UUID] = None
    item_title: Optional[str] = None
    item_type: Optional[str] = None
    item_year: Optional[int] = None
    parent_title: Optional[str] = None
    grandparent_title: Optional[str] = None
    season_number: Optional[int] = None
    episode_number: Optional[int] = None
    play_method: Optional[str] = None
    device_name: Optional[str] = None
    client_name: Optional[str] = None
    ip_address: Optional[str] = None

    @field_validator("ip_address", mode="before")
    @classmethod
    def coerce_ip(cls, v):
        return str(v) if v is not None else None
    started_at: datetime
    stopped_at: datetime
    play_duration_sec: int
    watched_pct: float
    completed: bool
    # Joined
    username: Optional[str] = None
    server_name: Optional[str] = None


class PaginatedSessionHistory(BaseModel):
    items: list[SessionHistoryResponse]
    total: int
    page: int
    page_size: int
