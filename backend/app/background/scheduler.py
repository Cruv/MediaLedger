import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select

from app.activity.pinger import ActivityPinger
from app.activity.processor import ActivityProcessor
from app.db.engine import async_session_factory
from app.media_servers.factory import get_client
from app.models.server import Server

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="UTC")
pinger = ActivityPinger(processor=ActivityProcessor())


async def poll_all_servers():
    """Master polling task: check each server at its configured interval."""
    async with async_session_factory() as db:
        result = await db.execute(select(Server).where(Server.is_active == True))
        servers = result.scalars().all()

        for server in servers:
            now = datetime.now(timezone.utc)
            last = server.last_polled_at
            if last:
                elapsed = (now - last.replace(tzinfo=timezone.utc)).total_seconds()
                if elapsed < server.poll_interval_sec:
                    continue

            try:
                client = await get_client(
                    str(server.id), server.server_type, server.base_url, server.api_key
                )
                await pinger.check_server(db, server.id, client)
                server.last_seen_at = now
                server.last_polled_at = now
                await db.commit()
            except Exception:
                logger.exception("Error polling server %s (%s)", server.name, server.id)


async def run_sharing_analysis():
    """Periodic sharing analysis for all users."""
    from app.sharing_engine.analyzer import SharingAnalyzer
    analyzer = SharingAnalyzer()
    await analyzer.analyze_all_users(window_days=30)


async def start_scheduler():
    from app.background.tasks import sync_all_libraries, sync_all_users

    scheduler.add_job(
        poll_all_servers,
        trigger=IntervalTrigger(seconds=5),
        id="poll_sessions",
        name="Poll active sessions from all servers",
        replace_existing=True,
    )
    scheduler.add_job(
        sync_all_users,
        trigger=IntervalTrigger(minutes=30),
        id="sync_users",
        name="Sync user lists from media servers",
        replace_existing=True,
    )
    scheduler.add_job(
        sync_all_libraries,
        trigger=IntervalTrigger(minutes=60),
        id="sync_libraries",
        name="Sync library items from media servers",
        replace_existing=True,
    )
    scheduler.add_job(
        run_sharing_analysis,
        trigger=IntervalTrigger(hours=6),
        id="sharing_analysis",
        name="Run sharing detection analysis",
        replace_existing=True,
    )
    # Alert evaluation
    from app.alerts.evaluator import evaluate_alerts
    scheduler.add_job(
        evaluate_alerts,
        trigger=IntervalTrigger(minutes=5),
        id="evaluate_alerts",
        name="Evaluate alert rules",
        replace_existing=True,
    )
    # Automation rules engine
    from app.automation.engine import run_automation
    scheduler.add_job(
        run_automation,
        trigger=IntervalTrigger(minutes=5),
        id="run_automation",
        name="Evaluate automation rules",
        replace_existing=True,
    )
    # Weekly admin digest (Mondays at 8am UTC)
    from app.routers.digest import send_weekly_digest
    scheduler.add_job(
        send_weekly_digest,
        trigger=CronTrigger(day_of_week="mon", hour=8, minute=0),
        id="weekly_digest",
        name="Send weekly admin digest",
        replace_existing=True,
    )
    # User expiry checker (every hour)
    from app.background.user_expiry import check_user_expiry
    scheduler.add_job(
        check_user_expiry,
        trigger=IntervalTrigger(hours=1),
        id="check_user_expiry",
        name="Disable expired users and send reminders",
        replace_existing=True,
    )
    # Run initial sync shortly after startup
    scheduler.add_job(
        sync_all_users,
        trigger="date",
        id="sync_users_initial",
        name="Initial user sync",
    )
    scheduler.add_job(
        sync_all_libraries,
        trigger="date",
        id="sync_libraries_initial",
        name="Initial library sync",
    )
    scheduler.start()
    logger.info("Background scheduler started")


async def shutdown_scheduler():
    scheduler.shutdown(wait=False)
    logger.info("Background scheduler stopped")
