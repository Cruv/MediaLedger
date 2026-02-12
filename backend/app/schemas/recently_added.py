from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class RecentlyAddedItem(BaseModel):
    id: str
    title: str
    item_type: str
    year: Optional[int] = None
    season_number: Optional[int] = None
    episode_number: Optional[int] = None
    runtime_ticks: Optional[int] = None
    added_at: Optional[datetime] = None
    genres: Optional[list[str]] = None
    thumb_url: Optional[str] = None
    library_name: str
    server_name: str

    model_config = {"from_attributes": True}


class RecentlyAddedResponse(BaseModel):
    items: list[RecentlyAddedItem]
    total: int
    days: int


class NewsletterPreview(BaseModel):
    html: str
    item_count: int
    period_days: int
