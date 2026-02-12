import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import or_

from app.db.engine import async_session_factory
from app.media_servers.factory import get_client
from app.models.library import Library, LibraryItem
from app.models.request import MediaRequest
from app.models.server import Server
from app.models.user import MediaServerUser

logger = logging.getLogger(__name__)


async def sync_all_users():
    """Refresh user lists from all active servers."""
    async with async_session_factory() as db:
        result = await db.execute(select(Server).where(Server.is_active == True))
        servers = result.scalars().all()

        for server in servers:
            try:
                client = await get_client(
                    str(server.id), server.server_type, server.base_url, server.api_key
                )
                remote_users = await client.get_users()

                for ru in remote_users:
                    stmt = pg_insert(MediaServerUser).values(
                        server_id=server.id,
                        remote_user_id=ru.user_id,
                        username=ru.username,
                        is_admin=ru.is_admin,
                        is_disabled=ru.is_disabled,
                        last_login_at=ru.last_login_at,
                        last_activity_at=ru.last_activity_at,
                        avatar_url=ru.avatar_url,
                        profile_json=ru.raw_json,
                    )
                    stmt = stmt.on_conflict_do_update(
                        index_elements=["server_id", "remote_user_id"],
                        set_={
                            "username": stmt.excluded.username,
                            "is_admin": stmt.excluded.is_admin,
                            "is_disabled": stmt.excluded.is_disabled,
                            "last_login_at": stmt.excluded.last_login_at,
                            "last_activity_at": stmt.excluded.last_activity_at,
                            "avatar_url": stmt.excluded.avatar_url,
                            "profile_json": stmt.excluded.profile_json,
                            "updated_at": datetime.now(timezone.utc),
                        },
                    )
                    await db.execute(stmt)

                await db.commit()
                logger.info(
                    "Synced %d users from %s", len(remote_users), server.name
                )
            except Exception:
                logger.exception("Failed to sync users from %s", server.name)
                await db.rollback()


async def sync_all_libraries():
    """Sync library metadata and items from all active servers."""
    async with async_session_factory() as db:
        result = await db.execute(select(Server).where(Server.is_active == True))
        servers = result.scalars().all()

        for server in servers:
            try:
                client = await get_client(
                    str(server.id), server.server_type, server.base_url, server.api_key
                )
                remote_libs = await client.get_libraries()

                for rl in remote_libs:
                    # Upsert library
                    lib_stmt = pg_insert(Library).values(
                        server_id=server.id,
                        remote_library_id=rl.library_id,
                        name=rl.name,
                        library_type=rl.library_type,
                        item_count=rl.item_count,
                    )
                    lib_stmt = lib_stmt.on_conflict_do_update(
                        index_elements=["server_id", "remote_library_id"],
                        set_={
                            "name": lib_stmt.excluded.name,
                            "library_type": lib_stmt.excluded.library_type,
                            "updated_at": datetime.now(timezone.utc),
                        },
                    )
                    await db.execute(lib_stmt)
                    await db.flush()

                    # Resolve the library row to get its UUID
                    lib_row = await db.execute(
                        select(Library).where(
                            Library.server_id == server.id,
                            Library.remote_library_id == rl.library_id,
                        )
                    )
                    db_lib = lib_row.scalar_one()

                    # Paginate through items
                    offset = 0
                    total_synced = 0
                    while True:
                        items, total = await client.get_library_items(
                            rl.library_id, start_index=offset, limit=200
                        )
                        if not items:
                            break

                        for item in items:
                            item_stmt = pg_insert(LibraryItem).values(
                                library_id=db_lib.id,
                                server_id=server.id,
                                remote_item_id=item.item_id,
                                title=item.title,
                                item_type=item.item_type,
                                year=item.year,
                                parent_remote_id=item.parent_id,
                                grandparent_remote_id=item.grandparent_id,
                                season_number=item.season_number,
                                episode_number=item.episode_number,
                                runtime_ticks=item.runtime_ticks,
                                added_at=item.added_at,
                                premiere_date=item.premiere_date.date() if item.premiere_date else None,
                                genres=item.genres or [],
                                imdb_id=item.imdb_id,
                                tmdb_id=item.tmdb_id,
                                tvdb_id=item.tvdb_id,
                                thumb_url=item.thumb_url,
                                global_play_count=item.play_count,
                                global_last_played_at=item.last_played_at,
                            )
                            item_stmt = item_stmt.on_conflict_do_update(
                                index_elements=["server_id", "remote_item_id"],
                                set_={
                                    "title": item_stmt.excluded.title,
                                    "item_type": item_stmt.excluded.item_type,
                                    "year": item_stmt.excluded.year,
                                    "runtime_ticks": item_stmt.excluded.runtime_ticks,
                                    "genres": item_stmt.excluded.genres,
                                    "imdb_id": item_stmt.excluded.imdb_id,
                                    "tmdb_id": item_stmt.excluded.tmdb_id,
                                    "tvdb_id": item_stmt.excluded.tvdb_id,
                                    "global_play_count": item_stmt.excluded.global_play_count,
                                    "global_last_played_at": item_stmt.excluded.global_last_played_at,
                                    "updated_at": datetime.now(timezone.utc),
                                },
                            )
                            await db.execute(item_stmt)

                        total_synced += len(items)
                        offset += len(items)
                        if offset >= total:
                            break

                    # Update library item count and sync timestamp
                    db_lib.item_count = total_synced
                    db_lib.last_synced_at = datetime.now(timezone.utc)

                await db.commit()
                logger.info(
                    "Synced %d libraries from %s", len(remote_libs), server.name
                )
            except Exception:
                logger.exception("Failed to sync libraries from %s", server.name)
                await db.rollback()

        # After syncing all servers, try to match unfulfilled requests to library items
        try:
            await match_requests_to_library(db)
            await db.commit()
        except Exception:
            logger.exception("Failed to match requests to library items")
            await db.rollback()


async def match_requests_to_library(db: AsyncSession):
    """Match pending/approved requests to newly-synced library items."""
    unfulfilled_q = select(MediaRequest).where(
        MediaRequest.status.in_(["pending", "approved"]),
        MediaRequest.fulfilled_item_id.is_(None),
    )
    result = await db.execute(unfulfilled_q)
    unfulfilled = result.scalars().all()

    matched = 0
    now = datetime.now(timezone.utc)
    for req in unfulfilled:
        item = await _find_matching_item(db, req)
        if item:
            req.fulfilled_item_id = item.id
            req.fulfilled_at = now
            req.status = "available"
            matched += 1

    if matched:
        logger.info("Matched %d requests to library items", matched)


async def _find_matching_item(db: AsyncSession, req: MediaRequest) -> LibraryItem | None:
    """Try to match a request to a library item via external IDs or title+year."""
    if req.imdb_id:
        result = await db.execute(
            select(LibraryItem).where(LibraryItem.imdb_id == req.imdb_id).limit(1)
        )
        item = result.scalar_one_or_none()
        if item:
            return item

    if req.tmdb_id:
        result = await db.execute(
            select(LibraryItem).where(LibraryItem.tmdb_id == req.tmdb_id).limit(1)
        )
        item = result.scalar_one_or_none()
        if item:
            return item

    if req.tvdb_id:
        result = await db.execute(
            select(LibraryItem).where(LibraryItem.tvdb_id == req.tvdb_id).limit(1)
        )
        item = result.scalar_one_or_none()
        if item:
            return item

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
