from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class NormalizedSession:
    session_id: str
    user_id: str
    username: str
    item_id: Optional[str] = None
    item_title: Optional[str] = None
    item_type: Optional[str] = None
    series_title: Optional[str] = None
    season_number: Optional[int] = None
    episode_number: Optional[int] = None
    state: str = "playing"
    position_ticks: int = 0
    runtime_ticks: Optional[int] = None
    play_method: Optional[str] = None
    device_name: Optional[str] = None
    device_id: Optional[str] = None
    client_name: Optional[str] = None
    ip_address: Optional[str] = None
    transcode_info: Optional[dict] = None
    raw_json: dict = field(default_factory=dict)


@dataclass
class NormalizedUser:
    user_id: str
    username: str
    is_admin: bool = False
    is_disabled: bool = False
    last_login_at: Optional[datetime] = None
    last_activity_at: Optional[datetime] = None
    avatar_url: Optional[str] = None
    raw_json: dict = field(default_factory=dict)


@dataclass
class NormalizedLibrary:
    library_id: str
    name: str
    library_type: str
    item_count: int = 0


@dataclass
class NormalizedLibraryItem:
    item_id: str
    title: str
    item_type: str
    year: Optional[int] = None
    parent_id: Optional[str] = None
    grandparent_id: Optional[str] = None
    season_number: Optional[int] = None
    episode_number: Optional[int] = None
    runtime_ticks: Optional[int] = None
    added_at: Optional[datetime] = None
    premiere_date: Optional[datetime] = None
    genres: list[str] = field(default_factory=list)
    imdb_id: Optional[str] = None
    tmdb_id: Optional[int] = None
    tvdb_id: Optional[int] = None
    thumb_url: Optional[str] = None
    play_count: int = 0
    last_played_at: Optional[datetime] = None
    raw_json: dict = field(default_factory=dict)


@dataclass
class NormalizedServerInfo:
    server_name: str
    server_id: str
    version: str
    os: Optional[str] = None
