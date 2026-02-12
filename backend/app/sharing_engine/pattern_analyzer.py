"""Viewing pattern analyzer — detects distinct usage personas via time clustering."""
import logging
import math
from collections import Counter
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.session import SessionHistory

logger = logging.getLogger(__name__)


async def analyze_patterns(
    db: AsyncSession,
    user_id: str,
    window_start: datetime,
    window_end: datetime,
) -> tuple[float, dict]:
    """
    Returns (score 0-100, evidence dict).
    Signals: time-of-day distribution entropy, content preference divergence,
    distinct viewing "personas" via clustering.
    """
    result = await db.execute(
        select(SessionHistory)
        .where(
            SessionHistory.user_id == user_id,
            SessionHistory.started_at >= window_start,
            SessionHistory.stopped_at <= window_end,
        )
        .order_by(SessionHistory.started_at)
    )
    sessions = result.scalars().all()

    if len(sessions) < 5:
        return 0.0, {"sessions_analyzed": len(sessions), "reason": "insufficient_data"}

    # 1. Time-of-day distribution entropy
    hour_counts = Counter(s.started_at.hour for s in sessions)
    entropy = _calc_entropy(hour_counts, len(sessions))

    # Higher entropy = more spread out across hours = more suspicious
    # A single person tends to watch at consistent times (low entropy)
    # Multiple people = high entropy (spread across many time slots)
    max_entropy = math.log2(24)  # ~4.58
    entropy_ratio = entropy / max_entropy if max_entropy > 0 else 0

    # 2. Check for distinct time clusters (morning/afternoon/evening/night personas)
    time_blocks = {"night": 0, "morning": 0, "afternoon": 0, "evening": 0}
    for s in sessions:
        h = s.started_at.hour
        if 0 <= h < 6:
            time_blocks["night"] += 1
        elif 6 <= h < 12:
            time_blocks["morning"] += 1
        elif 12 <= h < 18:
            time_blocks["afternoon"] += 1
        else:
            time_blocks["evening"] += 1

    active_blocks = sum(1 for v in time_blocks.values() if v >= 2)

    # 3. Content type diversity per time block
    content_by_block: dict[str, set[str]] = {"night": set(), "morning": set(), "afternoon": set(), "evening": set()}
    for s in sessions:
        h = s.started_at.hour
        item_type = s.item_type or "unknown"
        if 0 <= h < 6:
            content_by_block["night"].add(item_type)
        elif 6 <= h < 12:
            content_by_block["morning"].add(item_type)
        elif 12 <= h < 18:
            content_by_block["afternoon"].add(item_type)
        else:
            content_by_block["evening"].add(item_type)

    # 4. Day-of-week spread
    dow_counts = Counter(s.started_at.weekday() for s in sessions)
    active_days = len(dow_counts)

    # Scoring
    score = 0.0

    # High entropy suggests multiple people
    if entropy_ratio > 0.85:
        score += 30
    elif entropy_ratio > 0.7:
        score += 20
    elif entropy_ratio > 0.5:
        score += 10

    # Many active time blocks
    if active_blocks >= 4:
        score += 25
    elif active_blocks >= 3:
        score += 15

    # All 7 days active with high volume suggests sharing
    if active_days >= 7 and len(sessions) > 20:
        score += 15
    elif active_days >= 6 and len(sessions) > 15:
        score += 10

    # High session volume in window
    days_in_window = max(1, (window_end - window_start).days)
    sessions_per_day = len(sessions) / days_in_window
    if sessions_per_day > 10:
        score += 20
    elif sessions_per_day > 5:
        score += 10

    score = min(score, 100.0)

    evidence = {
        "sessions_analyzed": len(sessions),
        "time_entropy": round(entropy, 2),
        "entropy_ratio": round(entropy_ratio, 2),
        "time_blocks": time_blocks,
        "active_time_blocks": active_blocks,
        "active_days_of_week": active_days,
        "sessions_per_day": round(sessions_per_day, 1),
    }

    return score, evidence


def _calc_entropy(counts: Counter, total: int) -> float:
    """Calculate Shannon entropy of a distribution."""
    if total == 0:
        return 0.0
    entropy = 0.0
    for count in counts.values():
        if count > 0:
            p = count / total
            entropy -= p * math.log2(p)
    return entropy
