"""Server health monitoring: system info, transcode stats, active sessions summary."""

import logging
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.media_servers.factory import get_client
from app.models.server import Server
from app.models.session import PlaybackSession, SessionHistory

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/")
async def get_all_server_health(db: AsyncSession = Depends(get_db)):
    """Get health info for all active servers."""
    result = await db.execute(
        select(Server).where(Server.is_active == True)
    )
    servers = result.scalars().all()

    health_data = []
    for server in servers:
        info = {
            "server_id": str(server.id),
            "name": server.name,
            "type": server.server_type,
            "base_url": server.base_url,
            "version": server.server_version,
            "last_seen": server.last_seen_at.isoformat() if server.last_seen_at else None,
            "is_online": False,
            "system_info": None,
            "active_sessions": 0,
            "transcoding_sessions": 0,
        }

        # Count active sessions
        session_count = await db.execute(
            select(func.count(PlaybackSession.id))
            .where(PlaybackSession.server_id == server.id)
        )
        info["active_sessions"] = session_count.scalar() or 0

        # Count transcoding sessions
        transcode_count = await db.execute(
            select(func.count(PlaybackSession.id))
            .where(
                PlaybackSession.server_id == server.id,
                PlaybackSession.play_method == "Transcode",
            )
        )
        info["transcoding_sessions"] = transcode_count.scalar() or 0

        # Try to get live system info
        try:
            client = await get_client(
                str(server.id), server.server_type, server.base_url, server.api_key
            )
            sys_info = await client.get_system_info()
            info["is_online"] = True
            info["system_info"] = {
                "server_name": sys_info.get("ServerName"),
                "version": sys_info.get("Version"),
                "os": sys_info.get("OperatingSystem") or sys_info.get("OperatingSystemDisplayName"),
                "architecture": sys_info.get("SystemArchitecture"),
                "has_pending_restart": sys_info.get("HasPendingRestart", False),
                "transcode_path": sys_info.get("TranscodingTempPath"),
                "log_path": sys_info.get("LogPath"),
                "cache_path": sys_info.get("CachePath"),
                "internal_metadata_path": sys_info.get("InternalMetadataPath"),
                "can_self_restart": sys_info.get("CanSelfRestart", False),
                "local_address": sys_info.get("LocalAddress"),
            }
        except Exception:
            logger.debug("Could not fetch system info for %s", server.name)

        health_data.append(info)

    return health_data


@router.get("/{server_id}")
async def get_server_health(
    server_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get detailed health for a specific server."""
    server = await db.get(Server, server_id)
    if not server:
        from fastapi import HTTPException
        raise HTTPException(404, "Server not found")

    # Active sessions detail
    sessions = await db.execute(
        select(PlaybackSession)
        .where(PlaybackSession.server_id == server_id)
    )
    active = sessions.scalars().all()

    transcode_count = sum(1 for s in active if s.play_method == "Transcode")
    direct_play_count = sum(1 for s in active if s.play_method in ("DirectPlay", "DirectStream"))

    # Bandwidth estimate (rough: assume 8mbps transcode, 20mbps direct)
    est_bandwidth_mbps = (transcode_count * 8) + (direct_play_count * 20)

    # Session history stats (last 24h)
    from datetime import datetime, timedelta, timezone
    cutoff_24h = datetime.now(timezone.utc) - timedelta(hours=24)
    recent_stats = await db.execute(
        select(
            func.count(SessionHistory.id),
            func.coalesce(func.sum(SessionHistory.play_duration_sec), 0),
            func.count(SessionHistory.id).filter(SessionHistory.play_method == "Transcode"),
        )
        .where(
            SessionHistory.server_id == server_id,
            SessionHistory.started_at >= cutoff_24h,
        )
    )
    r24 = recent_stats.one()

    result = {
        "server_id": str(server.id),
        "name": server.name,
        "type": server.server_type,
        "version": server.server_version,
        "last_seen": server.last_seen_at.isoformat() if server.last_seen_at else None,
        "active_sessions": len(active),
        "transcoding_now": transcode_count,
        "direct_play_now": direct_play_count,
        "estimated_bandwidth_mbps": est_bandwidth_mbps,
        "last_24h": {
            "sessions": r24[0],
            "watch_hours": round(r24[1] / 3600, 1),
            "transcode_sessions": r24[2],
        },
    }

    # Try live system info
    try:
        client = await get_client(
            str(server.id), server.server_type, server.base_url, server.api_key
        )
        sys_info = await client.get_system_info()
        result["is_online"] = True
        result["system_info"] = {
            "server_name": sys_info.get("ServerName"),
            "version": sys_info.get("Version"),
            "os": sys_info.get("OperatingSystem") or sys_info.get("OperatingSystemDisplayName"),
            "architecture": sys_info.get("SystemArchitecture"),
            "has_pending_restart": sys_info.get("HasPendingRestart", False),
            "can_self_restart": sys_info.get("CanSelfRestart", False),
            "local_address": sys_info.get("LocalAddress"),
            "wan_address": sys_info.get("WanAddress"),
        }
    except Exception:
        result["is_online"] = False
        result["system_info"] = None

    return result
