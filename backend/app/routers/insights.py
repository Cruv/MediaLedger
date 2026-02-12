"""Media insights: unwatched content, completion rates, content analytics."""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.library import Library, LibraryItem
from app.models.server import Server
from app.models.session import SessionHistory

router = APIRouter()


@router.get("/unwatched")
async def unwatched_content(
    library_type: str | None = None,
    server_id: uuid.UUID | None = None,
    days_since_added: int = Query(30, ge=1, le=365),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Items in the library with zero plays, added at least N days ago."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days_since_added)
    query = (
        select(
            LibraryItem.id,
            LibraryItem.title,
            LibraryItem.item_type,
            LibraryItem.year,
            LibraryItem.added_at,
            LibraryItem.runtime_ticks,
            LibraryItem.genres,
            Library.name.label("library_name"),
            Server.name.label("server_name"),
        )
        .join(Library, LibraryItem.library_id == Library.id)
        .join(Server, LibraryItem.server_id == Server.id)
        .where(
            LibraryItem.global_play_count == 0,
            LibraryItem.added_at <= cutoff,
            LibraryItem.item_type.in_(["Movie", "Series"]),
        )
        .order_by(LibraryItem.added_at.asc())
        .limit(limit)
    )
    if library_type:
        query = query.where(Library.library_type == library_type)
    if server_id:
        query = query.where(LibraryItem.server_id == server_id)

    result = await db.execute(query)
    items = []
    for r in result.all():
        runtime_hrs = round(r.runtime_ticks / 36_000_000_000, 1) if r.runtime_ticks else None
        items.append({
            "id": str(r.id),
            "title": r.title,
            "type": r.item_type,
            "year": r.year,
            "added_at": r.added_at.isoformat() if r.added_at else None,
            "runtime_hours": runtime_hrs,
            "genres": r.genres or [],
            "library": r.library_name,
            "server": r.server_name,
        })

    # Count total unwatched
    count_q = (
        select(func.count(LibraryItem.id))
        .join(Library, LibraryItem.library_id == Library.id)
        .where(
            LibraryItem.global_play_count == 0,
            LibraryItem.added_at <= cutoff,
            LibraryItem.item_type.in_(["Movie", "Series"]),
        )
    )
    if library_type:
        count_q = count_q.where(Library.library_type == library_type)
    if server_id:
        count_q = count_q.where(LibraryItem.server_id == server_id)
    total = (await db.execute(count_q)).scalar() or 0

    return {"items": items, "total": total}


@router.get("/completion-rates")
async def completion_rates(
    days: int = Query(30, ge=1, le=365),
    server_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Completion rates for content types and individual shows/movies."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    # Overall by type
    type_query = (
        select(
            SessionHistory.item_type,
            func.count(SessionHistory.id).label("total"),
            func.count(SessionHistory.id).filter(SessionHistory.completed == True).label("completed"),
            func.avg(SessionHistory.watched_pct).label("avg_pct"),
        )
        .where(SessionHistory.started_at >= cutoff)
        .group_by(SessionHistory.item_type)
        .order_by(func.count(SessionHistory.id).desc())
    )
    if server_id:
        type_query = type_query.where(SessionHistory.server_id == server_id)
    type_result = await db.execute(type_query)
    by_type = [
        {
            "type": r.item_type or "Unknown",
            "total_plays": r.total,
            "completed": r.completed,
            "completion_rate": round(r.completed / r.total * 100, 1) if r.total > 0 else 0,
            "avg_watched_pct": round(float(r.avg_pct or 0), 1),
        }
        for r in type_result.all()
    ]

    # Shows with worst drop-off (series with many starts but low completion)
    title_col = case(
        (SessionHistory.grandparent_title.isnot(None), SessionHistory.grandparent_title),
        else_=SessionHistory.item_title,
    )
    show_query = (
        select(
            title_col.label("title"),
            SessionHistory.item_type,
            func.count(SessionHistory.id).label("total"),
            func.count(SessionHistory.id).filter(SessionHistory.completed == True).label("completed"),
            func.avg(SessionHistory.watched_pct).label("avg_pct"),
        )
        .where(SessionHistory.started_at >= cutoff)
        .group_by(title_col, SessionHistory.item_type)
        .having(func.count(SessionHistory.id) >= 3)  # minimum plays
        .order_by(func.avg(SessionHistory.watched_pct).asc())
        .limit(20)
    )
    if server_id:
        show_query = show_query.where(SessionHistory.server_id == server_id)
    show_result = await db.execute(show_query)
    most_dropped = [
        {
            "title": r.title or "Unknown",
            "type": r.item_type,
            "total_plays": r.total,
            "completed": r.completed,
            "completion_rate": round(r.completed / r.total * 100, 1) if r.total > 0 else 0,
            "avg_watched_pct": round(float(r.avg_pct or 0), 1),
        }
        for r in show_result.all()
    ]

    return {"by_type": by_type, "most_dropped": most_dropped}


@router.get("/popularity")
async def content_popularity(
    days: int = Query(7, ge=1, le=365),
    server_id: uuid.UUID | None = None,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Content popularity leaderboard for the given period."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    title_col = case(
        (SessionHistory.grandparent_title.isnot(None), SessionHistory.grandparent_title),
        else_=SessionHistory.item_title,
    )
    type_col = case(
        (SessionHistory.grandparent_title.isnot(None), "Series"),
        else_=SessionHistory.item_type,
    )
    query = (
        select(
            title_col.label("title"),
            type_col.label("type"),
            func.count(SessionHistory.id).label("plays"),
            func.count(func.distinct(SessionHistory.user_id)).label("unique_viewers"),
            func.coalesce(func.sum(SessionHistory.play_duration_sec), 0).label("total_duration_sec"),
            func.avg(SessionHistory.watched_pct).label("avg_watched_pct"),
        )
        .where(SessionHistory.started_at >= cutoff)
        .group_by(title_col, type_col)
        .order_by(func.count(SessionHistory.id).desc())
        .limit(limit)
    )
    if server_id:
        query = query.where(SessionHistory.server_id == server_id)

    result = await db.execute(query)
    items = [
        {
            "title": r.title or "Unknown",
            "type": r.type,
            "plays": r.plays,
            "unique_viewers": r.unique_viewers,
            "total_hours": round(r.total_duration_sec / 3600, 1),
            "avg_watched_pct": round(float(r.avg_watched_pct or 0), 1),
        }
        for r in result.all()
    ]

    return {"items": items, "period_days": days}


@router.get("/library-stats")
async def library_stats(db: AsyncSession = Depends(get_db)):
    """Stats per library: total items, watched %, storage estimate."""
    query = (
        select(
            Library.id,
            Library.name,
            Library.library_type,
            Server.name.label("server_name"),
            func.count(LibraryItem.id).label("total_items"),
            func.count(LibraryItem.id).filter(LibraryItem.global_play_count > 0).label("watched_items"),
            func.coalesce(func.sum(LibraryItem.runtime_ticks), 0).label("total_runtime_ticks"),
        )
        .join(LibraryItem, Library.id == LibraryItem.library_id, isouter=True)
        .join(Server, Library.server_id == Server.id)
        .group_by(Library.id, Library.name, Library.library_type, Server.name)
        .order_by(Library.name)
    )
    result = await db.execute(query)
    return [
        {
            "library_id": str(r.id),
            "name": r.name,
            "type": r.library_type,
            "server": r.server_name,
            "total_items": r.total_items,
            "watched_items": r.watched_items,
            "unwatched_items": r.total_items - r.watched_items,
            "watched_pct": round(r.watched_items / r.total_items * 100, 1) if r.total_items > 0 else 0,
            "total_runtime_hours": round(r.total_runtime_ticks / 36_000_000_000, 1) if r.total_runtime_ticks else 0,
        }
        for r in result.all()
    ]
