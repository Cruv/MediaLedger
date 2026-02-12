from pydantic import BaseModel


class DailyPlayCount(BaseModel):
    date: str
    plays: int
    completed: int


class DailyPlayDuration(BaseModel):
    date: str
    duration_hours: float


class HourlyActivity(BaseModel):
    hour: int
    day_of_week: int  # 0=Monday, 6=Sunday
    plays: int


class TopContent(BaseModel):
    title: str
    item_type: str
    plays: int
    total_duration_sec: int


class PlatformBreakdown(BaseModel):
    platform: str
    plays: int
    total_duration_sec: int


class PlayMethodBreakdown(BaseModel):
    play_method: str
    plays: int


class TopUser(BaseModel):
    user_id: str
    username: str
    plays: int
    total_duration_sec: int
