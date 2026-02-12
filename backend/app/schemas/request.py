from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class RequestCreate(BaseModel):
    title: str
    item_type: str = "Movie"  # Movie, Series
    year: Optional[int] = None
    imdb_id: Optional[str] = None
    tmdb_id: Optional[int] = None
    tvdb_id: Optional[int] = None
    requested_by_user_id: Optional[str] = None
    source: str = "manual"


class RequestUpdate(BaseModel):
    status: Optional[str] = None
    imdb_id: Optional[str] = None
    tmdb_id: Optional[int] = None
    tvdb_id: Optional[int] = None


class RequestResponse(BaseModel):
    id: str
    title: str
    item_type: str
    year: Optional[int] = None
    imdb_id: Optional[str] = None
    tmdb_id: Optional[int] = None
    tvdb_id: Optional[int] = None
    status: str
    source: str
    external_request_id: Optional[str] = None
    requested_by_username: Optional[str] = None
    requested_at: datetime
    fulfilled_at: Optional[datetime] = None
    fulfilled_item_title: Optional[str] = None
    first_watched_at: Optional[datetime] = None
    first_watched_by_username: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedRequests(BaseModel):
    items: list[RequestResponse]
    total: int
    page: int
    page_size: int


class RequestStatsResponse(BaseModel):
    total_requests: int
    pending: int
    approved: int
    available: int
    watched: int
    partially_watched: int
    declined: int
    never_watched: int
    avg_days_to_watch: Optional[float] = None
