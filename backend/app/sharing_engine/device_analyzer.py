"""Device analyzer — scores based on device count and sharing patterns."""
import logging
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sharing import DeviceFingerprint

logger = logging.getLogger(__name__)


async def analyze_devices(
    db: AsyncSession,
    user_id: str,
    window_start: datetime,
    window_end: datetime,
) -> tuple[float, dict]:
    """
    Returns (score 0-100, evidence dict).
    Signals: device count, rapid device switching, device overlap with other users.
    """
    result = await db.execute(
        select(DeviceFingerprint).where(
            DeviceFingerprint.user_id == user_id,
            DeviceFingerprint.last_seen_at >= window_start,
        )
    )
    devices = result.scalars().all()

    if len(devices) <= 1:
        return 0.0, {"device_count": len(devices), "reason": "single_device"}

    device_count = len(devices)

    # Check if any device_id is shared with other users
    shared_device_count = 0
    shared_device_users: list[dict] = []
    for d in devices:
        overlap_q = await db.execute(
            select(func.count(DeviceFingerprint.id)).where(
                DeviceFingerprint.device_id == d.device_id,
                DeviceFingerprint.user_id != user_id,
            )
        )
        overlap = overlap_q.scalar() or 0
        if overlap > 0:
            shared_device_count += 1
            shared_device_users.append({
                "device_id": d.device_id,
                "device_name": d.device_name,
                "other_user_count": overlap,
            })

    # Scoring
    score = 0.0

    # Device count (3 is normal — phone + TV + PC; 6+ suspicious)
    if device_count >= 8:
        score += 35
    elif device_count >= 6:
        score += 25
    elif device_count >= 4:
        score += 10

    # Shared devices across users is a strong signal
    if shared_device_count >= 3:
        score += 40
    elif shared_device_count >= 2:
        score += 25
    elif shared_device_count >= 1:
        score += 15

    # High session count across many devices
    total_sessions = sum(d.session_count for d in devices)
    avg_sessions_per_device = total_sessions / device_count if device_count else 0
    if avg_sessions_per_device > 20 and device_count >= 4:
        score += 15

    score = min(score, 100.0)

    evidence = {
        "device_count": device_count,
        "shared_device_count": shared_device_count,
        "shared_devices": shared_device_users[:5],
        "total_sessions": total_sessions,
        "devices": [
            {
                "device_id": d.device_id,
                "device_name": d.device_name,
                "client_name": d.client_name,
                "session_count": d.session_count,
                "last_seen": d.last_seen_at.isoformat() if d.last_seen_at else None,
            }
            for d in sorted(devices, key=lambda x: x.session_count, reverse=True)[:10]
        ],
    }

    return score, evidence
