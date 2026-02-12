"""Webhook receiver endpoints for Jellyfin and Emby."""
import logging

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.activity.pinger import ActivityPinger
from app.activity.processor import ActivityProcessor
from app.db.session import get_db
from app.media_servers.factory import get_client
from app.models.server import Server

logger = logging.getLogger(__name__)

router = APIRouter()
processor = ActivityProcessor()
pinger = ActivityPinger(processor=processor)


@router.post("/jellyfin")
async def jellyfin_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_webhook_secret: str | None = Header(None, alias="X-Webhook-Secret"),
):
    """
    Receive Jellyfin webhook events (requires Jellyfin Webhook plugin).
    Events: PlaybackStart, PlaybackStop, PlaybackProgress.
    """
    body = await request.json()
    event_type = body.get("NotificationType", "")
    server_id_str = body.get("ServerId")

    logger.debug("Jellyfin webhook: type=%s server=%s", event_type, server_id_str)

    # Verify the webhook secret if configured
    if server_id_str:
        result = await db.execute(
            select(Server).where(Server.server_id == server_id_str)
        )
        server = result.scalar_one_or_none()
    else:
        # Try to match by webhook secret
        if x_webhook_secret:
            result = await db.execute(
                select(Server).where(Server.webhook_secret == x_webhook_secret)
            )
            server = result.scalar_one_or_none()
        else:
            server = None

    if not server:
        raise HTTPException(status_code=404, detail="Server not recognized")

    if server.webhook_secret and x_webhook_secret != server.webhook_secret:
        raise HTTPException(status_code=403, detail="Invalid webhook secret")

    # On playback events, trigger a poll for this server to update sessions
    if event_type in ("PlaybackStart", "PlaybackStop", "PlaybackProgress"):
        try:
            client = await get_client(
                str(server.id), server.server_type, server.base_url, server.api_key
            )
            await pinger.check_server(db, server.id, client)
            await db.commit()
        except Exception:
            logger.exception("Error processing Jellyfin webhook for %s", server.name)

    return {"status": "ok"}


@router.post("/emby")
async def emby_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Receive Emby webhook events (requires Emby Premiere subscription).
    Events: playback.start, playback.stop, playback.progress.
    """
    body = await request.json()
    event_type = body.get("Event", "")
    server_info = body.get("Server", {})
    server_id_str = server_info.get("Id")

    logger.debug("Emby webhook: type=%s server=%s", event_type, server_id_str)

    server = None
    if server_id_str:
        result = await db.execute(
            select(Server).where(Server.server_id == server_id_str)
        )
        server = result.scalar_one_or_none()

    if not server:
        raise HTTPException(status_code=404, detail="Server not recognized")

    if event_type in ("playback.start", "playback.stop", "playback.progress"):
        try:
            client = await get_client(
                str(server.id), server.server_type, server.base_url, server.api_key
            )
            await pinger.check_server(db, server.id, client)
            await db.commit()
        except Exception:
            logger.exception("Error processing Emby webhook for %s", server.name)

    return {"status": "ok"}
