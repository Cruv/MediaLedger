import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.server import Server
from app.models.session import SessionHistory
from app.models.user import MediaServerUser
from app.schemas.graphs import (
    DailyPlayCount,
    DailyPlayDuration,
    HourlyActivity,
    PlayMethodBreakdown,
    PlatformBreakdown,
    TopContent,
    TopUser,
)

router = APIRouter()


def _default_range(days: int):
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=days)
    return start, end


@router.get("/daily-plays", response_model=list[DailyPlayCount])
async def daily_play_counts(
    days: int = Query(30, ge=1, le=365),
    server_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
):
    start, end = _default_range(days)
    date_col = func.date(SessionHistory.started_at)
    query = (
        select(
            date_col.label("date"),
            func.count(SessionHistory.id).label("plays"),
            func.count(SessionHistory.id).filter(SessionHistory.completed == True).label("completed"),
        )
        .where(SessionHistory.started_at.between(start, end))
        .group_by(date_col)
        .order_by(date_col)
    )
    if server_id:
        query = query.where(SessionHistory.server_id == server_id)

    result = await db.execute(query)
    return [
        DailyPlayCount(date=str(r.date), plays=r.plays, completed=r.completed)
        for r in result.all()
    ]


@router.get("/daily-duration", response_model=list[DailyPlayDuration])
async def daily_play_duration(
    days: int = Query(30, ge=1, le=365),
    server_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
):
    start, end = _default_range(days)
    date_col = func.date(SessionHistory.started_at)
    query = (
        select(
            date_col.label("date"),
            func.coalesce(func.sum(SessionHistory.play_duration_sec), 0).label("total_sec"),
        )
        .where(SessionHistory.started_at.between(start, end))
        .group_by(date_col)
        .order_by(date_col)
    )
    if server_id:
        query = query.where(SessionHistory.server_id == server_id)

    result = await db.execute(query)
    return [
        DailyPlayDuration(date=str(r.date), duration_hours=round(r.total_sec / 3600, 2))
        for r in result.all()
    ]


@router.get("/hourly-activity", response_model=list[HourlyActivity])
async def hourly_activity(
    days: int = Query(30, ge=1, le=365),
    server_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
):
    start, end = _default_range(days)
    hour_col = extract("hour", SessionHistory.started_at)
    dow_col = extract("isodow", SessionHistory.started_at)  # 1=Mon, 7=Sun
    query = (
        select(
            hour_col.label("hour"),
            dow_col.label("dow"),
            func.count(SessionHistory.id).label("plays"),
        )
        .where(SessionHistory.started_at.between(start, end))
        .group_by(hour_col, dow_col)
    )
    if server_id:
        query = query.where(SessionHistory.server_id == server_id)

    result = await db.execute(query)
    return [
        HourlyActivity(hour=int(r.hour), day_of_week=int(r.dow) - 1, plays=r.plays)
        for r in result.all()
    ]


@router.get("/top-content", response_model=list[TopContent])
async def top_content(
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(10, ge=1, le=50),
    server_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
):
    start, end = _default_range(days)
    # Group by show name for episodes, title for movies
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
            type_col.label("item_type"),
            func.count(SessionHistory.id).label("plays"),
            func.coalesce(func.sum(SessionHistory.play_duration_sec), 0).label("total_duration_sec"),
        )
        .where(SessionHistory.started_at.between(start, end))
        .group_by(title_col, type_col)
        .order_by(func.count(SessionHistory.id).desc())
        .limit(limit)
    )
    if server_id:
        query = query.where(SessionHistory.server_id == server_id)

    result = await db.execute(query)
    return [
        TopContent(
            title=r.title or "Unknown",
            item_type=r.item_type or "Unknown",
            plays=r.plays,
            total_duration_sec=r.total_duration_sec,
        )
        for r in result.all()
    ]


@router.get("/platforms", response_model=list[PlatformBreakdown])
async def platform_breakdown(
    days: int = Query(30, ge=1, le=365),
    server_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
):
    start, end = _default_range(days)
    platform_col = func.coalesce(SessionHistory.client_name, "Unknown")
    query = (
        select(
            platform_col.label("platform"),
            func.count(SessionHistory.id).label("plays"),
            func.coalesce(func.sum(SessionHistory.play_duration_sec), 0).label("total_duration_sec"),
        )
        .where(SessionHistory.started_at.between(start, end))
        .group_by(platform_col)
        .order_by(func.count(SessionHistory.id).desc())
    )
    if server_id:
        query = query.where(SessionHistory.server_id == server_id)

    result = await db.execute(query)
    return [
        PlatformBreakdown(platform=r.platform, plays=r.plays, total_duration_sec=r.total_duration_sec)
        for r in result.all()
    ]


@router.get("/play-methods", response_model=list[PlayMethodBreakdown])
async def play_method_breakdown(
    days: int = Query(30, ge=1, le=365),
    server_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
):
    start, end = _default_range(days)
    method_col = func.coalesce(SessionHistory.play_method, "Unknown")
    query = (
        select(
            method_col.label("play_method"),
            func.count(SessionHistory.id).label("plays"),
        )
        .where(SessionHistory.started_at.between(start, end))
        .group_by(method_col)
        .order_by(func.count(SessionHistory.id).desc())
    )
    if server_id:
        query = query.where(SessionHistory.server_id == server_id)

    result = await db.execute(query)
    return [
        PlayMethodBreakdown(play_method=r.play_method, plays=r.plays)
        for r in result.all()
    ]


@router.get("/top-users", response_model=list[TopUser])
async def top_users(
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(10, ge=1, le=50),
    server_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
):
    start, end = _default_range(days)
    query = (
        select(
            MediaServerUser.id.label("user_id"),
            MediaServerUser.username,
            func.count(SessionHistory.id).label("plays"),
            func.coalesce(func.sum(SessionHistory.play_duration_sec), 0).label("total_duration_sec"),
        )
        .join(MediaServerUser, SessionHistory.user_id == MediaServerUser.id)
        .where(SessionHistory.started_at.between(start, end))
        .group_by(MediaServerUser.id, MediaServerUser.username)
        .order_by(func.coalesce(func.sum(SessionHistory.play_duration_sec), 0).desc())
        .limit(limit)
    )
    if server_id:
        query = query.where(SessionHistory.server_id == server_id)

    result = await db.execute(query)
    return [
        TopUser(
            user_id=str(r.user_id),
            username=r.username,
            plays=r.plays,
            total_duration_sec=r.total_duration_sec,
        )
        for r in result.all()
    ]
