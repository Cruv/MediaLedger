import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.activity.processor import ActivityProcessor
from app.config import settings
from app.media_servers.base import MediaServerClient
from app.models.session import PlaybackSession

logger = logging.getLogger(__name__)


class ActivityPinger:
    """Polls media server sessions and detects changes."""

    def __init__(self, processor: ActivityProcessor):
        self.processor = processor

    async def check_server(
        self, db: AsyncSession, server_id: uuid.UUID, client: MediaServerClient
    ):
        """Poll a single server and process session changes."""
        try:
            current_sessions = await client.get_sessions()
        except Exception as e:
            logger.error("Failed to fetch sessions from server %s: %s", server_id, e)
            await self._reap_stale_for_server(db, server_id)
            return

        # Get known active sessions from DB
        result = await db.execute(
            select(PlaybackSession).where(PlaybackSession.server_id == server_id)
        )
        known_sessions = {ps.remote_session_id: ps for ps in result.scalars().all()}
        current_ids = {s.session_id for s in current_sessions}

        # New sessions
        for session in current_sessions:
            if session.session_id not in known_sessions:
                await self.processor.write_session(db, server_id, session)

        # Updated sessions
        for session in current_sessions:
            if session.session_id in known_sessions:
                known = known_sessions[session.session_id]
                await self.processor.update_session(db, known, session)

        # Ended sessions
        for remote_id, known in known_sessions.items():
            if remote_id not in current_ids:
                # Calculate play duration, skip if too short
                play_dur = 0
                if known.started_at:
                    play_dur = int(
                        (datetime.now(timezone.utc) - known.started_at.replace(tzinfo=timezone.utc)).total_seconds()
                    )

                if play_dur >= 120:  # Ignore sessions < 2 minutes
                    await self.processor.write_history(db, known)

                await self.processor.delete_session(db, known.id)

        await db.commit()

    async def _reap_stale_for_server(self, db: AsyncSession, server_id: uuid.UUID):
        """Clean up sessions for an unreachable server that exceed the stale timeout."""
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=settings.session_stale_timeout_min)
        result = await db.execute(
            select(PlaybackSession).where(
                PlaybackSession.server_id == server_id,
                PlaybackSession.last_activity_at < cutoff,
            )
        )
        stale = result.scalars().all()
        if not stale:
            return

        now = datetime.now(timezone.utc)
        for session in stale:
            play_dur = 0
            if session.started_at:
                play_dur = int(
                    (now - session.started_at.replace(tzinfo=timezone.utc)).total_seconds()
                )
            if play_dur >= 120:
                await self.processor.write_history(db, session)
            await self.processor.delete_session(db, session.id)
            logger.info("Reaped stale session %s from unreachable server %s", session.id, server_id)

        await db.commit()
