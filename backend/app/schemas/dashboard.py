from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.session import ActiveSessionResponse, SessionHistoryResponse


class ServerStatusResponse(BaseModel):
    id: str
    name: str
    server_type: str
    is_active: bool
    last_seen_at: Optional[datetime] = None
    online: bool


class TopUserResponse(BaseModel):
    user_id: str
    username: str
    server_name: str
    play_count: int
    total_watch_time_sec: int


class LibrarySummaryResponse(BaseModel):
    total_libraries: int
    total_items: int
    watched_items: int
    unwatched_items: int


class RequestSummaryResponse(BaseModel):
    total: int
    pending: int
    available: int
    watched: int
    never_watched: int


class DashboardResponse(BaseModel):
    active_streams: list[ActiveSessionResponse]
    server_statuses: list[ServerStatusResponse]
    recent_activity: list[SessionHistoryResponse]
    top_users_7d: list[TopUserResponse]
    library_summary: LibrarySummaryResponse
    request_summary: RequestSummaryResponse
    total_streams: int
    total_servers: int
