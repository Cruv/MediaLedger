"""Background job: disable expired users and send expiry reminders."""

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, and_

from app.db.engine import async_session_factory
from app.media_servers.factory import get_client
from app.models.server import Server
from app.models.user import MediaServerUser

logger = logging.getLogger(__name__)


async def check_user_expiry():
    """
    Runs periodically to:
    1. Disable users whose expires_at has passed
    2. Send reminder notifications for users expiring within 3 days
    """
    async with async_session_factory() as db:
        now = datetime.now(timezone.utc)

        # ── Disable expired users ──
        expired_result = await db.execute(
            select(MediaServerUser).where(
                and_(
                    MediaServerUser.expires_at.isnot(None),
                    MediaServerUser.expires_at <= now,
                    MediaServerUser.is_disabled == False,
                    MediaServerUser.auto_disabled_at.is_(None),
                )
            )
        )
        expired_users = expired_result.scalars().all()

        for user in expired_users:
            try:
                server = await db.get(Server, user.server_id)
                if not server or not server.is_active:
                    continue

                client = await get_client(
                    str(server.id), server.server_type, server.base_url, server.api_key
                )
                # Disable the user on the media server
                policy = await client.get_user_policy(user.remote_user_id)
                policy["IsDisabled"] = True
                await client.set_user_policy(user.remote_user_id, policy)

                user.is_disabled = True
                user.auto_disabled_at = now
                logger.info(
                    "Auto-disabled expired user %s (%s) on %s",
                    user.username, user.id, server.name,
                )
            except Exception:
                logger.exception(
                    "Failed to disable expired user %s on server %s",
                    user.username, user.server_id,
                )

        # ── Send 3-day reminder for expiring users ──
        reminder_cutoff = now + timedelta(days=3)
        expiring_result = await db.execute(
            select(MediaServerUser).where(
                and_(
                    MediaServerUser.expires_at.isnot(None),
                    MediaServerUser.expires_at > now,
                    MediaServerUser.expires_at <= reminder_cutoff,
                    MediaServerUser.is_disabled == False,
                    MediaServerUser.expiry_notified == False,
                )
            )
        )
        expiring_users = expiring_result.scalars().all()

        for user in expiring_users:
            try:
                from app.notifications.dispatcher import NotificationDispatcher
                dispatcher = NotificationDispatcher()
                days_left = (user.expires_at - now).days
                await dispatcher.dispatch(
                    db,
                    trigger="user_expiry",
                    subject=f"User expiring soon: {user.username}",
                    body=f"{user.username} will expire in {days_left} day(s).",
                )
                user.expiry_notified = True
                logger.info("Sent expiry reminder for user %s", user.username)
            except Exception:
                logger.exception(
                    "Failed to send expiry reminder for %s", user.username
                )

        await db.commit()
