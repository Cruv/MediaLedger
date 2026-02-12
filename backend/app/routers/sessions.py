import csv
import io
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.server import Server
from app.models.session import PlaybackSession, SessionHistory
from app.models.user import MediaServerUser
from app.schemas.session import (
    ActiveSessionResponse,
    PaginatedSessionHistory,
    SessionHistoryResponse,
    SessionStatsResponse,
)

router = APIRouter()


def _apply_history_filters(
    query,
    server_id: Optional[uuid.UUID],
    user_id: Optional[uuid.UUID],
    start_date: Optional[datetime],
    end_date: Optional[datetime],
    completed_only: bool,
    item_type: Optional[str],
    search: Optional[str],
):
    """Apply common filters to a session history query."""
    if server_id:
        query = query.where(SessionHistory.server_id == server_id)
    if user_id:
        query = query.where(SessionHistory.user_id == user_id)
    if start_date:
        query = query.where(SessionHistory.started_at >= start_date)
    if end_date:
        query = query.where(SessionHistory.started_at <= end_date)
    if completed_only:
        query = query.where(SessionHistory.completed == True)
    if item_type:
        query = query.where(SessionHistory.item_type == item_type)
    if search:
        term = f"%{search}%"
        query = query.where(
            or_(
                SessionHistory.item_title.ilike(term),
                SessionHistory.grandparent_title.ilike(term),
                MediaServerUser.username.ilike(term),
            )
        )
    return query


@router.get("/active", response_model=list[ActiveSessionResponse])
async def get_active_sessions(
    server_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(
            PlaybackSession,
            MediaServerUser.username,
            Server.name.label("server_name"),
        )
        .join(MediaServerUser, PlaybackSession.user_id == MediaServerUser.id)
        .join(Server, PlaybackSession.server_id == Server.id)
    )
    if server_id:
        query = query.where(PlaybackSession.server_id == server_id)

    result = await db.execute(query)
    sessions = []
    for row in result.all():
        ps = row[0]
        resp = ActiveSessionResponse.model_validate(ps)
        resp.username = row[1]
        resp.server_name = row[2]
        # Get item title from the raw session json if available
        raw = ps.raw_session_json or {}
        now_playing = raw.get("NowPlayingItem", {})
        resp.item_title = now_playing.get("Name")
        resp.item_type = now_playing.get("Type")
        resp.series_name = now_playing.get("SeriesName")
        resp.season_number = now_playing.get("ParentIndexNumber")
        resp.episode_number = now_playing.get("IndexNumber")
        sessions.append(resp)
    return sessions


@router.get("/history/stats", response_model=SessionStatsResponse)
async def get_session_stats(
    server_id: Optional[uuid.UUID] = None,
    user_id: Optional[uuid.UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    completed_only: bool = False,
    item_type: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Get aggregate statistics for session history with the same filters as the history list."""
    query = (
        select(
            func.count(SessionHistory.id).label("total_sessions"),
            func.count(SessionHistory.id).filter(SessionHistory.completed == True).label("completed_sessions"),
            func.coalesce(func.sum(SessionHistory.play_duration_sec), 0).label("total_watch_time_sec"),
            func.coalesce(func.avg(SessionHistory.watched_pct), 0).label("avg_watched_pct"),
            func.count(func.distinct(SessionHistory.user_id)).label("unique_users"),
        )
        .join(MediaServerUser, SessionHistory.user_id == MediaServerUser.id)
    )

    query = _apply_history_filters(query, server_id, user_id, start_date, end_date, completed_only, item_type, search)

    result = await db.execute(query)
    row = result.one()

    return SessionStatsResponse(
        total_sessions=row.total_sessions,
        completed_sessions=row.completed_sessions,
        total_watch_time_sec=row.total_watch_time_sec,
        avg_watched_pct=round(float(row.avg_watched_pct), 1),
        unique_users=row.unique_users,
    )


@router.get("/history/export")
async def export_session_history(
    server_id: Optional[uuid.UUID] = None,
    user_id: Optional[uuid.UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    completed_only: bool = False,
    item_type: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Export session history as CSV with the same filters as the history list."""
    base = (
        select(SessionHistory, MediaServerUser.username, Server.name.label("server_name"))
        .join(MediaServerUser, SessionHistory.user_id == MediaServerUser.id)
        .join(Server, SessionHistory.server_id == Server.id)
    )

    base = _apply_history_filters(base, server_id, user_id, start_date, end_date, completed_only, item_type, search)
    base = base.order_by(SessionHistory.started_at.desc())

    result = await db.execute(base)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Username", "Server", "Title", "Type", "Year", "Series", "Season", "Episode",
        "Started At", "Stopped At", "Duration (min)", "Watched %", "Completed",
        "Device", "Client", "IP Address", "Play Method",
    ])

    for row in result.all():
        sh = row[0]
        title = sh.item_title or ""
        if sh.grandparent_title:
            title = f"{sh.grandparent_title} - S{sh.season_number}E{sh.episode_number} - {sh.item_title}"

        writer.writerow([
            row[1],  # username
            row[2],  # server_name
            title,
            sh.item_type or "",
            sh.item_year or "",
            sh.grandparent_title or "",
            sh.season_number or "",
            sh.episode_number or "",
            sh.started_at.isoformat() if sh.started_at else "",
            sh.stopped_at.isoformat() if sh.stopped_at else "",
            round(sh.play_duration_sec / 60, 1) if sh.play_duration_sec else 0,
            round(sh.watched_pct, 1) if sh.watched_pct else 0,
            "Yes" if sh.completed else "No",
            sh.device_name or "",
            sh.client_name or "",
            str(sh.ip_address) if sh.ip_address else "",
            sh.play_method or "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=session_history.csv"},
    )


_SESSION_SORT_MAP = {
    "started_at": SessionHistory.started_at,
    "username": MediaServerUser.username,
    "server_name": Server.name,
    "play_duration_sec": SessionHistory.play_duration_sec,
    "watched_pct": SessionHistory.watched_pct,
    "item_title": SessionHistory.item_title,
}


@router.get("/history", response_model=PaginatedSessionHistory)
async def get_session_history(
    server_id: Optional[uuid.UUID] = None,
    user_id: Optional[uuid.UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    completed_only: bool = False,
    item_type: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = Query("started_at", pattern="^(started_at|username|server_name|play_duration_sec|watched_pct|item_title)$"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    base = (
        select(SessionHistory, MediaServerUser.username, Server.name.label("server_name"))
        .join(MediaServerUser, SessionHistory.user_id == MediaServerUser.id)
        .join(Server, SessionHistory.server_id == Server.id)
    )
    count_q = (
        select(func.count(SessionHistory.id))
        .join(MediaServerUser, SessionHistory.user_id == MediaServerUser.id)
    )

    base = _apply_history_filters(base, server_id, user_id, start_date, end_date, completed_only, item_type, search)
    count_q = _apply_history_filters(count_q, server_id, user_id, start_date, end_date, completed_only, item_type, search)

    total = (await db.execute(count_q)).scalar() or 0

    sort_col = _SESSION_SORT_MAP.get(sort_by, SessionHistory.started_at)
    order = sort_col.asc() if sort_dir == "asc" else sort_col.desc()

    offset = (page - 1) * page_size
    query = base.order_by(order).offset(offset).limit(page_size)
    result = await db.execute(query)

    items = []
    for row in result.all():
        sh = row[0]
        resp = SessionHistoryResponse.model_validate(sh)
        resp.username = row[1]
        resp.server_name = row[2]
        items.append(resp)

    return PaginatedSessionHistory(items=items, total=total, page=page, page_size=page_size)
