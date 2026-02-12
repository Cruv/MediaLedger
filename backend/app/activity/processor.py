import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.media_servers.models import NormalizedSession
from app.models.library import LibraryItem
from app.models.request import MediaRequest
from app.models.session import PlaybackSession, SessionHistory
from app.models.sharing import DeviceFingerprint, IPLog
from app.models.user import MediaServerUser

logger = logging.getLogger(__name__)


class ActivityProcessor:
    """Handles database operations for session lifecycle."""

    async def resolve_user(
        self, db: AsyncSession, server_id: uuid.UUID, remote_user_id: str, username: str
    ) -> MediaServerUser:
        """Find or create a media server user."""
        result = await db.execute(
            select(MediaServerUser).where(
                MediaServerUser.server_id == server_id,
                MediaServerUser.remote_user_id == remote_user_id,
            )
        )
        user = result.scalar_one_or_none()
        if not user:
            user = MediaServerUser(
                server_id=server_id,
                remote_user_id=remote_user_id,
                username=username,
            )
            db.add(user)
            await db.flush()
        return user

    async def resolve_item(
        self, db: AsyncSession, server_id: uuid.UUID, remote_item_id: str | None
    ) -> LibraryItem | None:
        if not remote_item_id:
            return None
        result = await db.execute(
            select(LibraryItem).where(
                LibraryItem.server_id == server_id,
                LibraryItem.remote_item_id == remote_item_id,
            )
        )
        return result.scalar_one_or_none()

    async def write_session(
        self, db: AsyncSession, server_id: uuid.UUID, session: NormalizedSession
    ) -> PlaybackSession:
        user = await self.resolve_user(db, server_id, session.user_id, session.username)
        item = await self.resolve_item(db, server_id, session.item_id)

        ps = PlaybackSession(
            server_id=server_id,
            user_id=user.id,
            item_id=item.id if item else None,
            remote_session_id=session.session_id,
            state=session.state,
            play_method=session.play_method,
            device_name=session.device_name,
            device_id=session.device_id,
            client_name=session.client_name,
            ip_address=session.ip_address,
            position_ticks=session.position_ticks,
            runtime_ticks=session.runtime_ticks,
            transcode_info=session.transcode_info,
            raw_session_json=session.raw_json,
        )
        db.add(ps)
        await db.flush()
        logger.info("New session: user=%s item=%s", session.username, session.item_title)

        # Log IP and device for sharing analysis
        if session.ip_address:
            await self._log_ip(db, user.id, server_id, session.ip_address)
        if session.device_id:
            await self._log_device(
                db, user.id, server_id, session.device_id,
                session.device_name, session.client_name,
            )

        return ps

    async def update_session(
        self, db: AsyncSession, known: PlaybackSession, session: NormalizedSession
    ):
        """Update an active session with new data."""
        known.state = session.state
        known.position_ticks = session.position_ticks
        known.last_activity_at = datetime.now(timezone.utc)
        known.raw_session_json = session.raw_json
        if session.play_method:
            known.play_method = session.play_method

    async def write_history(self, db: AsyncSession, known: PlaybackSession) -> SessionHistory:
        """Convert active session to permanent history record."""
        now = datetime.now(timezone.utc)
        play_duration = int((now - known.started_at.replace(tzinfo=timezone.utc)).total_seconds())
        play_duration = max(0, play_duration - known.paused_counter)

        watched_pct = 0.0
        if known.runtime_ticks and known.runtime_ticks > 0:
            watched_pct = (known.position_ticks / known.runtime_ticks) * 100

        # Get denormalized metadata from raw session json
        raw = known.raw_session_json or {}
        now_playing = raw.get("NowPlayingItem", {})

        history = SessionHistory(
            server_id=known.server_id,
            user_id=known.user_id,
            item_id=known.item_id,
            item_title=now_playing.get("Name"),
            item_type=now_playing.get("Type"),
            item_year=now_playing.get("ProductionYear"),
            parent_title=now_playing.get("SeasonName"),
            grandparent_title=now_playing.get("SeriesName"),
            season_number=now_playing.get("ParentIndexNumber"),
            episode_number=now_playing.get("IndexNumber"),
            play_method=known.play_method,
            device_name=known.device_name,
            device_id=known.device_id,
            client_name=known.client_name,
            ip_address=known.ip_address,
            started_at=known.started_at,
            stopped_at=now,
            play_duration_sec=play_duration,
            paused_counter_sec=known.paused_counter,
            runtime_ticks=known.runtime_ticks,
            position_ticks=known.position_ticks,
            watched_pct=round(watched_pct, 1),
            completed=watched_pct >= 85.0,  # TODO: read from app_settings
            buffer_count=known.buffer_count,
            transcode_info=known.transcode_info,
        )
        db.add(history)
        await db.flush()
        logger.info(
            "Session ended: user_id=%s item=%s watched=%.1f%%",
            known.user_id,
            now_playing.get("Name"),
            watched_pct,
        )

        # Check if this play fulfills any media requests
        if history.completed and known.item_id:
            await self._check_request_watched(db, known.item_id, known.user_id, now)

        return history

    async def _check_request_watched(
        self, db: AsyncSession, item_id: uuid.UUID, user_id: uuid.UUID, when: datetime
    ):
        """Mark matching 'available' requests as watched when their fulfilled item is played."""
        result = await db.execute(
            select(MediaRequest).where(
                MediaRequest.fulfilled_item_id == item_id,
                MediaRequest.status == "available",
                MediaRequest.first_watched_at.is_(None),
            )
        )
        requests = result.scalars().all()
        for req in requests:
            req.first_watched_at = when
            req.first_watched_by_id = user_id
            req.status = "watched"
            logger.info(
                "Request '%s' marked as watched by user_id=%s", req.title, user_id
            )

    async def _log_ip(
        self, db: AsyncSession, user_id: uuid.UUID, server_id: uuid.UUID, ip_address: str
    ):
        """Upsert an IP log entry for the user."""
        now = datetime.now(timezone.utc)
        stmt = pg_insert(IPLog).values(
            user_id=user_id,
            server_id=server_id,
            ip_address=ip_address,
            first_seen_at=now,
            last_seen_at=now,
            hit_count=1,
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=["user_id", "ip_address"],
            set_={
                "last_seen_at": now,
                "hit_count": IPLog.hit_count + 1,
            },
        )
        await db.execute(stmt)

    async def _log_device(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        server_id: uuid.UUID,
        device_id: str,
        device_name: str | None,
        client_name: str | None,
    ):
        """Upsert a device fingerprint entry for the user."""
        now = datetime.now(timezone.utc)
        stmt = pg_insert(DeviceFingerprint).values(
            user_id=user_id,
            server_id=server_id,
            device_id=device_id,
            device_name=device_name,
            client_name=client_name,
            first_seen_at=now,
            last_seen_at=now,
            session_count=1,
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=["user_id", "device_id"],
            set_={
                "last_seen_at": now,
                "device_name": device_name,
                "client_name": client_name,
                "session_count": DeviceFingerprint.session_count + 1,
            },
        )
        await db.execute(stmt)

    async def delete_session(self, db: AsyncSession, session_id: uuid.UUID):
        ps = await db.get(PlaybackSession, session_id)
        if ps:
            await db.delete(ps)
