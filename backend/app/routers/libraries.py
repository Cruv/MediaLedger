import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.library import Library, LibraryItem
from app.models.server import Server
from app.models.session import SessionHistory
from app.schemas.library import (
    LibraryItemResponse,
    LibraryResponse,
    LibraryStatsResponse,
    PaginatedLibraryItems,
)

router = APIRouter()


@router.post("/sync", status_code=202)
async def trigger_library_sync():
    """Manually trigger a library sync for all active servers."""
    import asyncio
    from app.background.tasks import sync_all_libraries
    asyncio.create_task(sync_all_libraries())
    return {"message": "Library sync started"}


@router.get("/", response_model=list[LibraryResponse])
async def list_libraries(
    server_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Library, Server.name.label("server_name"))
        .join(Server, Library.server_id == Server.id)
        .order_by(Server.name, Library.name)
    )
    if server_id:
        query = query.where(Library.server_id == server_id)

    result = await db.execute(query)
    libraries = []
    for row in result.all():
        lib = row[0]
        resp = LibraryResponse.model_validate(lib)
        resp.server_name = row[1]

        # Compute watched/unwatched item counts
        total_q = await db.execute(
            select(func.count(LibraryItem.id)).where(LibraryItem.library_id == lib.id)
        )
        resp.total_items = total_q.scalar() or 0

        watched_q = await db.execute(
            select(func.count(LibraryItem.id)).where(
                LibraryItem.library_id == lib.id,
                LibraryItem.global_play_count > 0,
            )
        )
        resp.watched_items = watched_q.scalar() or 0
        resp.unwatched_items = resp.total_items - resp.watched_items

        libraries.append(resp)
    return libraries


@router.get("/stats", response_model=LibraryStatsResponse)
async def get_library_stats(db: AsyncSession = Depends(get_db)):
    total_libs = (await db.execute(select(func.count(Library.id)))).scalar() or 0
    total_items = (await db.execute(select(func.count(LibraryItem.id)))).scalar() or 0
    total_movies = (
        await db.execute(
            select(func.count(LibraryItem.id)).where(LibraryItem.item_type == "Movie")
        )
    ).scalar() or 0
    total_episodes = (
        await db.execute(
            select(func.count(LibraryItem.id)).where(LibraryItem.item_type == "Episode")
        )
    ).scalar() or 0
    total_plays = (
        await db.execute(select(func.coalesce(func.sum(LibraryItem.global_play_count), 0)))
    ).scalar() or 0

    return LibraryStatsResponse(
        total_libraries=total_libs,
        total_items=total_items,
        total_movies=total_movies,
        total_episodes=total_episodes,
        total_plays=total_plays,
    )


@router.get("/{library_id}", response_model=LibraryResponse)
async def get_library(library_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Library, Server.name.label("server_name"))
        .join(Server, Library.server_id == Server.id)
        .where(Library.id == library_id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Library not found")

    lib = row[0]
    resp = LibraryResponse.model_validate(lib)
    resp.server_name = row[1]

    total_q = await db.execute(
        select(func.count(LibraryItem.id)).where(LibraryItem.library_id == lib.id)
    )
    resp.total_items = total_q.scalar() or 0
    watched_q = await db.execute(
        select(func.count(LibraryItem.id)).where(
            LibraryItem.library_id == lib.id,
            LibraryItem.global_play_count > 0,
        )
    )
    resp.watched_items = watched_q.scalar() or 0
    resp.unwatched_items = resp.total_items - resp.watched_items
    return resp


@router.get("/{library_id}/items", response_model=PaginatedLibraryItems)
async def get_library_items(
    library_id: uuid.UUID,
    item_type: Optional[str] = None,
    watched: Optional[bool] = None,
    sort_by: str = Query("title", pattern="^(title|year|added_at|global_play_count)$"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    base = select(LibraryItem).where(LibraryItem.library_id == library_id)
    count_q = select(func.count(LibraryItem.id)).where(LibraryItem.library_id == library_id)

    if item_type:
        base = base.where(LibraryItem.item_type == item_type)
        count_q = count_q.where(LibraryItem.item_type == item_type)
    if watched is True:
        base = base.where(LibraryItem.global_play_count > 0)
        count_q = count_q.where(LibraryItem.global_play_count > 0)
    elif watched is False:
        base = base.where(LibraryItem.global_play_count == 0)
        count_q = count_q.where(LibraryItem.global_play_count == 0)
    if search:
        base = base.where(LibraryItem.title.ilike(f"%{search}%"))
        count_q = count_q.where(LibraryItem.title.ilike(f"%{search}%"))

    total = (await db.execute(count_q)).scalar() or 0

    sort_col = getattr(LibraryItem, sort_by)
    order = sort_col.desc() if sort_order == "desc" else sort_col.asc()
    offset = (page - 1) * page_size
    query = base.order_by(order).offset(offset).limit(page_size)

    result = await db.execute(query)
    items = [LibraryItemResponse.model_validate(i) for i in result.scalars().all()]

    return PaginatedLibraryItems(items=items, total=total, page=page, page_size=page_size)
