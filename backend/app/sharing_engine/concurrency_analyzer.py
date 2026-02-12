"""Concurrent stream analyzer — detects overlapping sessions from different locations."""
import logging
from datetime import datetime

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.session import SessionHistory
from app.models.sharing import ConcurrentStreamEvent
from app.sharing_engine.geo import haversine_km

logger = logging.getLogger(__name__)


async def analyze_concurrency(
    db: AsyncSession,
    user_id: str,
    window_start: datetime,
    window_end: datetime,
) -> tuple[float, dict]:
    """
    Returns (score 0-100, evidence dict).
    Detects overlapping sessions, especially from different IPs/locations.
    """
    # Get all sessions for this user in the window
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

    if len(sessions) < 2:
        return 0.0, {"overlapping_events": 0, "reason": "insufficient_sessions"}

    # Find overlapping session pairs
    overlaps = []
    for i in range(len(sessions)):
        for j in range(i + 1, len(sessions)):
            a, b = sessions[i], sessions[j]
            # Check temporal overlap
            overlap_start = max(a.started_at, b.started_at)
            overlap_end = min(a.stopped_at, b.stopped_at)
            if overlap_start < overlap_end:
                overlap_duration_sec = (overlap_end - overlap_start).total_seconds()
                # Only count overlaps > 60 seconds to avoid false positives
                if overlap_duration_sec > 60:
                    same_ip = (a.ip_address and b.ip_address and a.ip_address == b.ip_address)
                    same_device = (a.device_id and b.device_id and a.device_id == b.device_id)
                    overlaps.append({
                        "session_a_id": str(a.id),
                        "session_b_id": str(b.id),
                        "overlap_seconds": int(overlap_duration_sec),
                        "same_ip": same_ip,
                        "same_device": same_device,
                        "ip_a": str(a.ip_address) if a.ip_address else None,
                        "ip_b": str(b.ip_address) if b.ip_address else None,
                        "device_a": a.device_name,
                        "device_b": b.device_name,
                    })

    if not overlaps:
        return 0.0, {"overlapping_events": 0}

    # Count suspicious overlaps (different IP or different device)
    diff_ip_overlaps = [o for o in overlaps if not o["same_ip"]]
    diff_device_overlaps = [o for o in overlaps if not o["same_device"]]

    # Scoring
    score = 0.0

    total_overlaps = len(overlaps)
    if total_overlaps >= 10:
        score += 30
    elif total_overlaps >= 5:
        score += 20
    elif total_overlaps >= 1:
        score += 10

    # Different-IP overlaps are much more suspicious
    if len(diff_ip_overlaps) >= 5:
        score += 40
    elif len(diff_ip_overlaps) >= 3:
        score += 30
    elif len(diff_ip_overlaps) >= 1:
        score += 20

    # Long overlapping sessions are more suspicious
    max_overlap = max(o["overlap_seconds"] for o in overlaps)
    if max_overlap > 3600:  # > 1 hour
        score += 20
    elif max_overlap > 600:  # > 10 min
        score += 10

    score = min(score, 100.0)

    evidence = {
        "overlapping_events": total_overlaps,
        "different_ip_overlaps": len(diff_ip_overlaps),
        "different_device_overlaps": len(diff_device_overlaps),
        "max_overlap_seconds": max_overlap,
        "recent_overlaps": overlaps[:10],
    }

    return score, evidence
