import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.server import Server
from app.models.session import PlaybackSession, SessionHistory
from app.models.user import MediaServerUser
from app.schemas.session import ActiveSessionResponse, PaginatedSessionHistory, SessionHistoryResponse

router = APIRouter()


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
        sessions.append(resp)
    return sessions


@router.get("/history", response_model=PaginatedSessionHistory)
async def get_session_history(
    server_id: Optional[uuid.UUID] = None,
    user_id: Optional[uuid.UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    completed_only: bool = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    base = (
        select(SessionHistory, MediaServerUser.username, Server.name.label("server_name"))
        .join(MediaServerUser, SessionHistory.user_id == MediaServerUser.id)
        .join(Server, SessionHistory.server_id == Server.id)
    )
    count_q = select(func.count(SessionHistory.id))

    if server_id:
        base = base.where(SessionHistory.server_id == server_id)
        count_q = count_q.where(SessionHistory.server_id == server_id)
    if user_id:
        base = base.where(SessionHistory.user_id == user_id)
        count_q = count_q.where(SessionHistory.user_id == user_id)
    if start_date:
        base = base.where(SessionHistory.started_at >= start_date)
        count_q = count_q.where(SessionHistory.started_at >= start_date)
    if end_date:
        base = base.where(SessionHistory.started_at <= end_date)
        count_q = count_q.where(SessionHistory.started_at <= end_date)
    if completed_only:
        base = base.where(SessionHistory.completed == True)
        count_q = count_q.where(SessionHistory.completed == True)

    total = (await db.execute(count_q)).scalar() or 0

    offset = (page - 1) * page_size
    query = base.order_by(SessionHistory.started_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)

    items = []
    for row in result.all():
        sh = row[0]
        resp = SessionHistoryResponse.model_validate(sh)
        resp.username = row[1]
        resp.server_name = row[2]
        items.append(resp)

    return PaginatedSessionHistory(items=items, total=total, page=page, page_size=page_size)
