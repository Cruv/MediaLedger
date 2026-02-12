import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.server import Server
from app.models.session import SessionHistory
from app.models.user import MediaServerUser
from app.schemas.user import (
    PaginatedUsers,
    UserDetailResponse,
    UserDeviceResponse,
    UserResponse,
    UserSessionSummary,
)

router = APIRouter()


@router.get("/", response_model=PaginatedUsers)
async def list_users(
    server_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    base = (
        select(
            MediaServerUser,
            Server.name.label("server_name"),
            Server.server_type.label("server_type"),
        )
        .join(Server, MediaServerUser.server_id == Server.id)
    )
    count_q = select(func.count(MediaServerUser.id))

    if server_id:
        base = base.where(MediaServerUser.server_id == server_id)
        count_q = count_q.where(MediaServerUser.server_id == server_id)
    if search:
        base = base.where(MediaServerUser.username.ilike(f"%{search}%"))
        count_q = count_q.where(MediaServerUser.username.ilike(f"%{search}%"))

    total = (await db.execute(count_q)).scalar() or 0

    offset = (page - 1) * page_size
    query = base.order_by(MediaServerUser.username).offset(offset).limit(page_size)
    result = await db.execute(query)

    users = []
    for row in result.all():
        user = row[0]
        resp = UserResponse.model_validate(user)
        resp.server_name = row[1]
        resp.server_type = row[2]

        # Compute play stats
        stats = await db.execute(
            select(
                func.count(SessionHistory.id),
                func.coalesce(func.sum(SessionHistory.play_duration_sec), 0),
            ).where(SessionHistory.user_id == user.id)
        )
        stats_row = stats.one()
        resp.total_plays = stats_row[0]
        resp.total_watch_time_sec = stats_row[1]

        users.append(resp)

    return PaginatedUsers(items=users, total=total, page=page, page_size=page_size)


@router.get("/{user_id}", response_model=UserDetailResponse)
async def get_user(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            MediaServerUser,
            Server.name.label("server_name"),
            Server.server_type.label("server_type"),
        )
        .join(Server, MediaServerUser.server_id == Server.id)
        .where(MediaServerUser.id == user_id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    user = row[0]
    resp = UserDetailResponse.model_validate(user)
    resp.server_name = row[1]
    resp.server_type = row[2]

    # Play stats
    stats = await db.execute(
        select(
            func.count(SessionHistory.id),
            func.coalesce(func.sum(SessionHistory.play_duration_sec), 0),
        ).where(SessionHistory.user_id == user.id)
    )
    stats_row = stats.one()
    resp.total_plays = stats_row[0]
    resp.total_watch_time_sec = stats_row[1]

    # Devices from session history
    device_q = await db.execute(
        select(
            SessionHistory.device_name,
            SessionHistory.device_id,
            SessionHistory.client_name,
            func.max(SessionHistory.stopped_at).label("last_seen_at"),
            func.count(SessionHistory.id).label("session_count"),
        )
        .where(SessionHistory.user_id == user.id)
        .group_by(
            SessionHistory.device_name,
            SessionHistory.device_id,
            SessionHistory.client_name,
        )
        .order_by(func.max(SessionHistory.stopped_at).desc())
    )
    resp.devices = [
        UserDeviceResponse(
            device_name=d[0],
            device_id=d[1],
            client_name=d[2],
            last_seen_at=d[3],
            session_count=d[4],
        )
        for d in device_q.all()
    ]

    # Recent sessions
    recent_q = await db.execute(
        select(SessionHistory)
        .where(SessionHistory.user_id == user.id)
        .order_by(SessionHistory.started_at.desc())
        .limit(20)
    )
    resp.recent_sessions = [
        UserSessionSummary(
            id=s.id,
            item_title=s.item_title,
            item_type=s.item_type,
            started_at=s.started_at,
            stopped_at=s.stopped_at,
            watched_pct=s.watched_pct,
            completed=s.completed,
            device_name=s.device_name,
        )
        for s in recent_q.scalars().all()
    ]

    return resp
