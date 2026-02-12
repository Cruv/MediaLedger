import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.server import Server
from app.models.session import SessionHistory
from app.models.tags import UserTagAssignment
from app.models.user import MediaServerUser, UserCorrelation
from app.schemas.user import (
    LinkedUserBrief,
    LinkedUsersResponse,
    PaginatedUsers,
    UserDetailResponse,
    UserDeviceResponse,
    UserResponse,
    UserSessionSummary,
    UserTagBrief,
)

router = APIRouter()


@router.get("/", response_model=PaginatedUsers)
async def list_users(
    server_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    tag_id: Optional[uuid.UUID] = None,
    sort_by: str = Query("username", pattern="^(username|server_name|last_activity_at)$"),
    sort_dir: str = Query("asc", pattern="^(asc|desc)$"),
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
        .options(selectinload(MediaServerUser.tags))
    )
    count_q = select(func.count(MediaServerUser.id))

    if server_id:
        base = base.where(MediaServerUser.server_id == server_id)
        count_q = count_q.where(MediaServerUser.server_id == server_id)
    if search:
        base = base.where(MediaServerUser.username.ilike(f"%{search}%"))
        count_q = count_q.where(MediaServerUser.username.ilike(f"%{search}%"))
    if tag_id:
        base = base.join(UserTagAssignment, MediaServerUser.id == UserTagAssignment.user_id).where(
            UserTagAssignment.tag_id == tag_id
        )
        count_q = count_q.join(UserTagAssignment, MediaServerUser.id == UserTagAssignment.user_id).where(
            UserTagAssignment.tag_id == tag_id
        )

    total = (await db.execute(count_q)).scalar() or 0

    _user_sort_map = {
        "username": MediaServerUser.username,
        "server_name": Server.name,
        "last_activity_at": MediaServerUser.last_activity_at,
    }
    sort_col = _user_sort_map.get(sort_by, MediaServerUser.username)
    order = sort_col.asc() if sort_dir == "asc" else sort_col.desc()

    offset = (page - 1) * page_size
    query = base.order_by(order).offset(offset).limit(page_size)
    result = await db.execute(query)

    users = []
    for row in result.unique().all():
        user = row[0]
        resp = UserResponse.model_validate(user)
        resp.server_name = row[1]
        resp.server_type = row[2]
        resp.tags = [UserTagBrief(id=t.id, name=t.name, color=t.color) for t in user.tags]

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

        # Count linked servers (same username on different servers)
        linked_count = await db.execute(
            select(func.count(func.distinct(MediaServerUser.server_id))).where(
                MediaServerUser.username == user.username,
                MediaServerUser.server_id != user.server_id,
            )
        )
        resp.linked_server_count = linked_count.scalar() or 0

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
        .options(selectinload(MediaServerUser.tags))
        .where(MediaServerUser.id == user_id)
    )
    row = result.unique().one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    user = row[0]
    resp = UserDetailResponse.model_validate(user)
    resp.server_name = row[1]
    resp.server_type = row[2]
    resp.tags = [UserTagBrief(id=t.id, name=t.name, color=t.color) for t in user.tags]

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


@router.get("/{user_id}/linked", response_model=LinkedUsersResponse)
async def get_linked_users(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Find users linked to this user by username match or explicit correlation."""
    target = await db.get(MediaServerUser, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # Username matches on other servers
    username_matches = await db.execute(
        select(MediaServerUser, Server.name.label("server_name"), Server.server_type)
        .join(Server, MediaServerUser.server_id == Server.id)
        .where(
            MediaServerUser.username == target.username,
            MediaServerUser.server_id != target.server_id,
        )
    )

    # Explicit correlations involving this user
    correlations = await db.execute(
        select(UserCorrelation).where(
            or_(
                UserCorrelation.user_a_id == user_id,
                UserCorrelation.user_b_id == user_id,
            )
        )
    )
    corr_map: dict[uuid.UUID, UserCorrelation] = {}
    for c in correlations.scalars().all():
        other_id = c.user_b_id if c.user_a_id == user_id else c.user_a_id
        corr_map[other_id] = c

    linked: list[LinkedUserBrief] = []
    seen_ids: set[uuid.UUID] = set()

    for row in username_matches.all():
        other_user = row[0]
        seen_ids.add(other_user.id)
        corr = corr_map.get(other_user.id)

        stats = await db.execute(
            select(
                func.count(SessionHistory.id),
                func.coalesce(func.sum(SessionHistory.play_duration_sec), 0),
            ).where(SessionHistory.user_id == other_user.id)
        )
        sr = stats.one()

        linked.append(
            LinkedUserBrief(
                id=other_user.id,
                server_id=other_user.server_id,
                server_name=row[1],
                server_type=row[2],
                username=other_user.username,
                total_plays=sr[0],
                total_watch_time_sec=sr[1],
                correlation_id=corr.id if corr else None,
                correlation_type=corr.correlation_type if corr else "username_match",
                confirmed_by_admin=corr.confirmed_by_admin if corr else False,
            )
        )

    # Correlation-only links (different username, manually linked)
    for other_id, corr in corr_map.items():
        if other_id in seen_ids:
            continue
        other_result = await db.execute(
            select(MediaServerUser, Server.name, Server.server_type)
            .join(Server, MediaServerUser.server_id == Server.id)
            .where(MediaServerUser.id == other_id)
        )
        other_row = other_result.one_or_none()
        if not other_row:
            continue
        other_user = other_row[0]
        stats = await db.execute(
            select(
                func.count(SessionHistory.id),
                func.coalesce(func.sum(SessionHistory.play_duration_sec), 0),
            ).where(SessionHistory.user_id == other_user.id)
        )
        sr = stats.one()
        linked.append(
            LinkedUserBrief(
                id=other_user.id,
                server_id=other_user.server_id,
                server_name=other_row[1],
                server_type=other_row[2],
                username=other_user.username,
                total_plays=sr[0],
                total_watch_time_sec=sr[1],
                correlation_id=corr.id,
                correlation_type=corr.correlation_type,
                confirmed_by_admin=corr.confirmed_by_admin,
            )
        )

    return LinkedUsersResponse(linked_users=linked)


@router.post("/{user_id}/link/{other_id}")
async def link_users(user_id: uuid.UUID, other_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Manually link two user accounts across servers."""
    user_a = await db.get(MediaServerUser, user_id)
    user_b = await db.get(MediaServerUser, other_id)
    if not user_a or not user_b:
        raise HTTPException(status_code=404, detail="One or both users not found")
    if user_a.server_id == user_b.server_id:
        raise HTTPException(status_code=400, detail="Cannot link users on the same server")

    # Check if correlation already exists
    existing = await db.execute(
        select(UserCorrelation).where(
            or_(
                (UserCorrelation.user_a_id == user_id) & (UserCorrelation.user_b_id == other_id),
                (UserCorrelation.user_a_id == other_id) & (UserCorrelation.user_b_id == user_id),
            )
        )
    )
    corr = existing.scalar_one_or_none()

    if corr:
        corr.confirmed_by_admin = True
        corr.correlation_type = "manual"
    else:
        corr = UserCorrelation(
            user_a_id=user_id,
            user_b_id=other_id,
            correlation_type="manual",
            confidence_score=1.0,
            confirmed_by_admin=True,
            evidence_json={"reason": "admin_manual_link"},
        )
        db.add(corr)

    await db.commit()
    return {"status": "linked", "correlation_id": str(corr.id)}


@router.delete("/{user_id}/link/{other_id}")
async def unlink_users(user_id: uuid.UUID, other_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Remove a link between two user accounts."""
    result = await db.execute(
        select(UserCorrelation).where(
            or_(
                (UserCorrelation.user_a_id == user_id) & (UserCorrelation.user_b_id == other_id),
                (UserCorrelation.user_a_id == other_id) & (UserCorrelation.user_b_id == user_id),
            )
        )
    )
    corr = result.scalar_one_or_none()
    if not corr:
        raise HTTPException(status_code=404, detail="No link found between these users")

    await db.delete(corr)
    await db.commit()
    return {"status": "unlinked"}
