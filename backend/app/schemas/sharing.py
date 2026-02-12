from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class SharingScoreResponse(BaseModel):
    user_id: str
    username: str
    server_name: str
    overall_score: float
    ip_diversity_score: float
    concurrency_score: float
    pattern_score: float
    device_score: float
    cross_server_score: float
    severity: str  # low, moderate, high, critical
    analysis_window_start: datetime
    analysis_window_end: datetime
    computed_at: datetime

    model_config = {"from_attributes": True}


class SharingScoreDetailResponse(SharingScoreResponse):
    evidence: Optional[dict[str, Any]] = None


class SharingOverviewResponse(BaseModel):
    total_users_analyzed: int
    critical_count: int
    high_count: int
    moderate_count: int
    low_count: int
    scores: list[SharingScoreResponse]
