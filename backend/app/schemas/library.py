import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class LibraryResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    server_id: uuid.UUID
    remote_library_id: str
    name: str
    library_type: str
    item_count: int
    is_active: bool
    last_synced_at: Optional[datetime] = None
    # Joined
    server_name: Optional[str] = None
    # Computed stats
    total_items: Optional[int] = None
    watched_items: Optional[int] = None
    unwatched_items: Optional[int] = None


class LibraryItemResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    library_id: uuid.UUID
    server_id: uuid.UUID
    remote_item_id: str
    title: str
    item_type: str
    year: Optional[int] = None
    season_number: Optional[int] = None
    episode_number: Optional[int] = None
    runtime_ticks: Optional[int] = None
    added_at: Optional[datetime] = None
    premiere_date: Optional[date] = None
    genres: Optional[list[str]] = None
    imdb_id: Optional[str] = None
    tmdb_id: Optional[int] = None
    global_play_count: int = 0
    global_last_played_at: Optional[datetime] = None


class PaginatedLibraryItems(BaseModel):
    items: list[LibraryItemResponse]
    total: int
    page: int
    page_size: int


class LibraryStatsResponse(BaseModel):
    total_libraries: int
    total_items: int
    total_movies: int
    total_episodes: int
    total_plays: int
