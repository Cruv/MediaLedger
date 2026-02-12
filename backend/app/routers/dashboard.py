from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.library import LibraryItem
from app.models.request import MediaRequest
from app.models.server import Server
from app.models.session import PlaybackSession, SessionHistory
from app.models.user import MediaServerUser
from app.schemas.dashboard import (
    DashboardResponse,
    LibrarySummaryResponse,
    RequestSummaryResponse,
    ServerStatusResponse,
    TopUserResponse,
)
from app.schemas.session import ActiveSessionResponse, SessionHistoryResponse

router = APIRouter()

ONLINE_THRESHOLD_SECONDS = 120


@router.get("/", response_model=DashboardResponse)
async def get_dashboard(db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)

    # Active streams
    streams_q = (
        select(PlaybackSession, MediaServerUser.username, Server.name.label("server_name"))
        .join(MediaServerUser, PlaybackSession.user_id == MediaServerUser.id)
        .join(Server, PlaybackSession.server_id == Server.id)
    )
    streams_result = await db.execute(streams_q)
    active_streams = []
    for row in streams_result.all():
        ps = row[0]
        resp = ActiveSessionResponse.model_validate(ps)
        resp.username = row[1]
        resp.server_name = row[2]
        raw = ps.raw_session_json or {}
        now_playing = raw.get("NowPlayingItem", {})
        resp.item_title = now_playing.get("Name")
        resp.item_type = now_playing.get("Type")
        active_streams.append(resp)

    # Server statuses
    servers_result = await db.execute(select(Server).order_by(Server.name))
    server_statuses = []
    for s in servers_result.scalars():
        online = False
        if s.last_seen_at:
            online = (now - s.last_seen_at).total_seconds() < ONLINE_THRESHOLD_SECONDS
        server_statuses.append(
            ServerStatusResponse(
                id=str(s.id),
                name=s.name,
                server_type=s.server_type,
                is_active=s.is_active,
                last_seen_at=s.last_seen_at,
                online=online,
            )
        )

    # Recent activity (last 10)
    recent_q = (
        select(SessionHistory, MediaServerUser.username, Server.name.label("server_name"))
        .join(MediaServerUser, SessionHistory.user_id == MediaServerUser.id)
        .join(Server, SessionHistory.server_id == Server.id)
        .order_by(SessionHistory.started_at.desc())
        .limit(10)
    )
    recent_result = await db.execute(recent_q)
    recent_activity = []
    for row in recent_result.all():
        sh = row[0]
        resp = SessionHistoryResponse.model_validate(sh)
        resp.username = row[1]
        resp.server_name = row[2]
        recent_activity.append(resp)

    # Top users (last 7 days)
    seven_days_ago = now - timedelta(days=7)
    top_q = await db.execute(
        select(
            MediaServerUser.id,
            MediaServerUser.username,
            Server.name.label("server_name"),
            func.count(SessionHistory.id).label("play_count"),
            func.coalesce(func.sum(SessionHistory.play_duration_sec), 0).label("total_watch_time_sec"),
        )
        .join(SessionHistory, SessionHistory.user_id == MediaServerUser.id)
        .join(Server, MediaServerUser.server_id == Server.id)
        .where(SessionHistory.started_at >= seven_days_ago)
        .group_by(MediaServerUser.id, MediaServerUser.username, Server.name)
        .order_by(func.count(SessionHistory.id).desc())
        .limit(10)
    )
    top_users_7d = [
        TopUserResponse(
            user_id=str(r[0]),
            username=r[1],
            server_name=r[2],
            play_count=r[3],
            total_watch_time_sec=r[4],
        )
        for r in top_q.all()
    ]

    # Library summary
    total_items = (await db.execute(select(func.count(LibraryItem.id)))).scalar() or 0
    watched_items = (
        await db.execute(
            select(func.count(LibraryItem.id)).where(LibraryItem.global_play_count > 0)
        )
    ).scalar() or 0
    total_libs = (await db.execute(select(func.count()).select_from(Server))).scalar() or 0
    library_summary = LibrarySummaryResponse(
        total_libraries=total_libs,
        total_items=total_items,
        watched_items=watched_items,
        unwatched_items=total_items - watched_items,
    )

    # Request summary
    total_requests = (await db.execute(select(func.count(MediaRequest.id)))).scalar() or 0
    pending_requests = (await db.execute(
        select(func.count(MediaRequest.id)).where(MediaRequest.status == "pending")
    )).scalar() or 0
    available_requests = (await db.execute(
        select(func.count(MediaRequest.id)).where(MediaRequest.status == "available")
    )).scalar() or 0
    watched_requests = (await db.execute(
        select(func.count(MediaRequest.id)).where(MediaRequest.status == "watched")
    )).scalar() or 0
    never_watched_requests = (await db.execute(
        select(func.count(MediaRequest.id)).where(
            MediaRequest.status == "available",
            MediaRequest.first_watched_at.is_(None),
        )
    )).scalar() or 0
    request_summary = RequestSummaryResponse(
        total=total_requests,
        pending=pending_requests,
        available=available_requests,
        watched=watched_requests,
        never_watched=never_watched_requests,
    )

    return DashboardResponse(
        active_streams=active_streams,
        server_statuses=server_statuses,
        recent_activity=recent_activity,
        top_users_7d=top_users_7d,
        library_summary=library_summary,
        request_summary=request_summary,
        total_streams=len(active_streams),
        total_servers=len(server_statuses),
    )
