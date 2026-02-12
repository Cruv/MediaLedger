import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.library import LibraryItem
from app.models.request import MediaRequest
from app.models.user import MediaServerUser
from app.schemas.request import (
    PaginatedRequests,
    RequestCreate,
    RequestResponse,
    RequestStatsResponse,
    RequestUpdate,
)

router = APIRouter()


def _build_response(req: MediaRequest, requested_by_username: str | None = None,
                    fulfilled_item_title: str | None = None,
                    first_watched_by_username: str | None = None) -> RequestResponse:
    return RequestResponse(
        id=str(req.id),
        title=req.title,
        item_type=req.item_type,
        year=req.year,
        imdb_id=req.imdb_id,
        tmdb_id=req.tmdb_id,
        tvdb_id=req.tvdb_id,
        status=req.status,
        source=req.source,
        external_request_id=req.external_request_id,
        requested_by_username=requested_by_username,
        requested_at=req.requested_at,
        fulfilled_at=req.fulfilled_at,
        fulfilled_item_title=fulfilled_item_title,
        first_watched_at=req.first_watched_at,
        first_watched_by_username=first_watched_by_username,
        created_at=req.created_at,
    )


@router.get("/", response_model=PaginatedRequests)
async def list_requests(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    status: Optional[str] = None,
    source: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """List all media requests with pagination and filters."""
    base = select(MediaRequest)

    if status:
        base = base.where(MediaRequest.status == status)
    if source:
        base = base.where(MediaRequest.source == source)
    if search:
        base = base.where(MediaRequest.title.ilike(f"%{search}%"))

    # Count
    count_q = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Fetch page
    rows_q = (
        base
        .order_by(MediaRequest.requested_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(rows_q)
    requests = result.scalars().all()

    # Resolve usernames and item titles
    items = []
    for req in requests:
        requested_by_username = None
        if req.requested_by_user_id:
            u = await db.get(MediaServerUser, req.requested_by_user_id)
            if u:
                requested_by_username = u.username

        fulfilled_item_title = None
        if req.fulfilled_item_id:
            item = await db.get(LibraryItem, req.fulfilled_item_id)
            if item:
                fulfilled_item_title = item.title

        first_watched_by_username = None
        if req.first_watched_by_id:
            u = await db.get(MediaServerUser, req.first_watched_by_id)
            if u:
                first_watched_by_username = u.username

        items.append(_build_response(req, requested_by_username, fulfilled_item_title, first_watched_by_username))

    return PaginatedRequests(items=items, total=total, page=page, page_size=page_size)


@router.get("/stats", response_model=RequestStatsResponse)
async def get_request_stats(db: AsyncSession = Depends(get_db)):
    """Get aggregate request statistics."""
    total = (await db.execute(select(func.count(MediaRequest.id)))).scalar() or 0

    async def count_status(s: str) -> int:
        return (await db.execute(
            select(func.count(MediaRequest.id)).where(MediaRequest.status == s)
        )).scalar() or 0

    pending = await count_status("pending")
    approved = await count_status("approved")
    available = await count_status("available")
    watched = await count_status("watched")
    partially_watched = await count_status("partially_watched")
    declined = await count_status("declined")

    # "never watched" = available for 30+ days but no first_watched_at
    never_watched_q = select(func.count(MediaRequest.id)).where(
        MediaRequest.status == "available",
        MediaRequest.fulfilled_at.isnot(None),
        MediaRequest.first_watched_at.is_(None),
    )
    never_watched = (await db.execute(never_watched_q)).scalar() or 0

    # Average days from fulfilled_at to first_watched_at
    avg_q = select(
        func.avg(
            func.extract("epoch", MediaRequest.first_watched_at - MediaRequest.fulfilled_at) / 86400
        )
    ).where(
        MediaRequest.first_watched_at.isnot(None),
        MediaRequest.fulfilled_at.isnot(None),
    )
    avg_days = (await db.execute(avg_q)).scalar()
    avg_days_to_watch = round(avg_days, 1) if avg_days else None

    return RequestStatsResponse(
        total_requests=total,
        pending=pending,
        approved=approved,
        available=available,
        watched=watched,
        partially_watched=partially_watched,
        declined=declined,
        never_watched=never_watched,
        avg_days_to_watch=avg_days_to_watch,
    )


@router.post("/", response_model=RequestResponse, status_code=201)
async def create_request(body: RequestCreate, db: AsyncSession = Depends(get_db)):
    """Create a manual media request."""
    req = MediaRequest(
        title=body.title,
        item_type=body.item_type,
        year=body.year,
        imdb_id=body.imdb_id,
        tmdb_id=body.tmdb_id,
        tvdb_id=body.tvdb_id,
        requested_by_user_id=uuid.UUID(body.requested_by_user_id) if body.requested_by_user_id else None,
        source=body.source,
        status="pending",
    )

    # Auto-match: check if item already exists in library
    matched_item = await _find_matching_item(db, req)
    if matched_item:
        req.fulfilled_item_id = matched_item.id
        req.fulfilled_at = datetime.now(timezone.utc)
        req.status = "available"

    db.add(req)
    await db.commit()
    await db.refresh(req)

    requested_by_username = None
    if req.requested_by_user_id:
        u = await db.get(MediaServerUser, req.requested_by_user_id)
        if u:
            requested_by_username = u.username

    fulfilled_title = None
    if matched_item:
        fulfilled_title = matched_item.title

    return _build_response(req, requested_by_username, fulfilled_title)


@router.get("/{request_id}", response_model=RequestResponse)
async def get_request(request_id: str, db: AsyncSession = Depends(get_db)):
    req = await db.get(MediaRequest, uuid.UUID(request_id))
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    requested_by_username = None
    if req.requested_by_user_id:
        u = await db.get(MediaServerUser, req.requested_by_user_id)
        if u:
            requested_by_username = u.username

    fulfilled_item_title = None
    if req.fulfilled_item_id:
        item = await db.get(LibraryItem, req.fulfilled_item_id)
        if item:
            fulfilled_item_title = item.title

    first_watched_by_username = None
    if req.first_watched_by_id:
        u = await db.get(MediaServerUser, req.first_watched_by_id)
        if u:
            first_watched_by_username = u.username

    return _build_response(req, requested_by_username, fulfilled_item_title, first_watched_by_username)


@router.patch("/{request_id}", response_model=RequestResponse)
async def update_request(request_id: str, body: RequestUpdate, db: AsyncSession = Depends(get_db)):
    req = await db.get(MediaRequest, uuid.UUID(request_id))
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if body.status is not None:
        req.status = body.status
    if body.imdb_id is not None:
        req.imdb_id = body.imdb_id
    if body.tmdb_id is not None:
        req.tmdb_id = body.tmdb_id
    if body.tvdb_id is not None:
        req.tvdb_id = body.tvdb_id

    await db.commit()
    await db.refresh(req)
    return await get_request(request_id, db)


@router.delete("/{request_id}", status_code=204)
async def delete_request(request_id: str, db: AsyncSession = Depends(get_db)):
    req = await db.get(MediaRequest, uuid.UUID(request_id))
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    await db.delete(req)
    await db.commit()


async def _find_matching_item(db: AsyncSession, req: MediaRequest) -> LibraryItem | None:
    """Try to match a request to an existing library item via external IDs or title+year."""
    # Match by IMDB ID first (most reliable)
    if req.imdb_id:
        result = await db.execute(
            select(LibraryItem).where(LibraryItem.imdb_id == req.imdb_id).limit(1)
        )
        item = result.scalar_one_or_none()
        if item:
            return item

    # Match by TMDB ID
    if req.tmdb_id:
        result = await db.execute(
            select(LibraryItem).where(LibraryItem.tmdb_id == req.tmdb_id).limit(1)
        )
        item = result.scalar_one_or_none()
        if item:
            return item

    # Match by TVDB ID
    if req.tvdb_id:
        result = await db.execute(
            select(LibraryItem).where(LibraryItem.tvdb_id == req.tvdb_id).limit(1)
        )
        item = result.scalar_one_or_none()
        if item:
            return item

    # Fallback: title + year match (for Movies and top-level Series only)
    if req.item_type in ("Movie", "Series") and req.year:
        result = await db.execute(
            select(LibraryItem)
            .where(
                LibraryItem.title.ilike(req.title),
                LibraryItem.item_type == req.item_type,
                LibraryItem.year == req.year,
            )
            .limit(1)
        )
        return result.scalar_one_or_none()

    return None
