"""Cross-server correlation analyzer — detects the same person on Emby + Jellyfin."""
import logging
import uuid as uuid_mod
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sharing import DeviceFingerprint, IPLog
from app.models.user import MediaServerUser, UserCorrelation

logger = logging.getLogger(__name__)


async def analyze_cross_server(
    db: AsyncSession,
    user_id: str,
    window_start: datetime,
    window_end: datetime,
) -> tuple[float, dict]:
    """
    Returns (score 0-100, evidence dict).
    Looks for other users (on different servers) who share IPs, devices, or username.
    """
    # Get this user (ensure UUID type for db.get primary key lookup)
    user = await db.get(MediaServerUser, uuid_mod.UUID(user_id) if isinstance(user_id, str) else user_id)
    if not user:
        return 0.0, {"reason": "user_not_found"}

    # Get IPs for this user
    ip_result = await db.execute(
        select(IPLog.ip_address).where(
            IPLog.user_id == user_id,
            IPLog.last_seen_at >= window_start,
        )
    )
    user_ips = {str(r[0]) for r in ip_result.all()}

    # Get devices for this user
    dev_result = await db.execute(
        select(DeviceFingerprint.device_id).where(
            DeviceFingerprint.user_id == user_id,
            DeviceFingerprint.last_seen_at >= window_start,
        )
    )
    user_devices = {r[0] for r in dev_result.all()}

    correlations: list[dict] = []
    score = 0.0

    if not user_ips and not user_devices:
        return 0.0, {"reason": "no_data"}

    # Find other users on DIFFERENT servers with overlapping IPs
    if user_ips:
        ip_overlap_q = await db.execute(
            select(
                IPLog.user_id,
                MediaServerUser.username,
                MediaServerUser.server_id,
                func.count(IPLog.id).label("shared_ips"),
            )
            .join(MediaServerUser, IPLog.user_id == MediaServerUser.id)
            .where(
                IPLog.ip_address.in_(user_ips),
                IPLog.user_id != user_id,
                MediaServerUser.server_id != user.server_id,
                IPLog.last_seen_at >= window_start,
            )
            .group_by(IPLog.user_id, MediaServerUser.username, MediaServerUser.server_id)
        )
        for row in ip_overlap_q.all():
            correlations.append({
                "other_user_id": str(row[0]),
                "other_username": row[1],
                "type": "ip_overlap",
                "shared_count": row[3],
            })

    # Find other users on DIFFERENT servers with overlapping devices
    if user_devices:
        dev_overlap_q = await db.execute(
            select(
                DeviceFingerprint.user_id,
                MediaServerUser.username,
                MediaServerUser.server_id,
                func.count(DeviceFingerprint.id).label("shared_devices"),
            )
            .join(MediaServerUser, DeviceFingerprint.user_id == MediaServerUser.id)
            .where(
                DeviceFingerprint.device_id.in_(user_devices),
                DeviceFingerprint.user_id != user_id,
                MediaServerUser.server_id != user.server_id,
                DeviceFingerprint.last_seen_at >= window_start,
            )
            .group_by(DeviceFingerprint.user_id, MediaServerUser.username, MediaServerUser.server_id)
        )
        for row in dev_overlap_q.all():
            correlations.append({
                "other_user_id": str(row[0]),
                "other_username": row[1],
                "type": "device_overlap",
                "shared_count": row[3],
            })

    # Username matching across servers
    name_match_q = await db.execute(
        select(MediaServerUser).where(
            MediaServerUser.username == user.username,
            MediaServerUser.id != user_id,
            MediaServerUser.server_id != user.server_id,
        )
    )
    name_matches = name_match_q.scalars().all()
    for m in name_matches:
        correlations.append({
            "other_user_id": str(m.id),
            "other_username": m.username,
            "type": "username_match",
            "shared_count": 1,
        })

    if not correlations:
        return 0.0, {"correlations": 0}

    # Scoring
    unique_correlated_users = len({c["other_user_id"] for c in correlations})
    ip_correlations = [c for c in correlations if c["type"] == "ip_overlap"]
    device_correlations = [c for c in correlations if c["type"] == "device_overlap"]
    name_correlations = [c for c in correlations if c["type"] == "username_match"]

    # Strong: user on another server shares both IP and device
    users_with_both = set()
    ip_users = {c["other_user_id"] for c in ip_correlations}
    dev_users = {c["other_user_id"] for c in device_correlations}
    users_with_both = ip_users & dev_users

    if len(users_with_both) >= 1:
        score += 50
    elif len(ip_correlations) >= 1:
        score += 25
    elif len(device_correlations) >= 1:
        score += 20

    if len(name_correlations) >= 1:
        score += 20

    if unique_correlated_users >= 3:
        score += 20
    elif unique_correlated_users >= 2:
        score += 10

    score = min(score, 100.0)

    evidence = {
        "correlated_users": unique_correlated_users,
        "ip_correlations": len(ip_correlations),
        "device_correlations": len(device_correlations),
        "name_matches": len(name_correlations),
        "users_with_both_ip_and_device": len(users_with_both),
        "correlations": correlations[:10],
    }

    return score, evidence
