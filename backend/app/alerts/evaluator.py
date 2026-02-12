import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import async_session_factory
from app.models.alerts import AlertEvent, AlertRule
from app.models.session import PlaybackSession
from app.models.sharing import DeviceFingerprint, IPLog, SharingScore
from app.models.user import MediaServerUser

logger = logging.getLogger(__name__)


async def evaluate_alerts():
    """Evaluate all enabled alert rules and create events for triggered conditions."""
    async with async_session_factory() as db:
        result = await db.execute(
            select(AlertRule).where(AlertRule.is_enabled == True)
        )
        rules = result.scalars().all()

        for rule in rules:
            try:
                # Check cooldown
                if await _in_cooldown(db, rule):
                    continue

                triggered, context = await _evaluate_rule(db, rule)
                if triggered:
                    event = AlertEvent(
                        rule_id=rule.id,
                        context_json=context,
                    )
                    db.add(event)
                    await db.commit()
                    logger.info("Alert triggered: %s - %s", rule.name, context.get("summary", ""))
            except Exception:
                logger.exception("Error evaluating alert rule %s", rule.name)
                await db.rollback()


async def _in_cooldown(db: AsyncSession, rule: AlertRule) -> bool:
    """Check if the rule has fired recently within its cooldown period."""
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=rule.cooldown_minutes)
    result = await db.execute(
        select(func.count(AlertEvent.id)).where(
            AlertEvent.rule_id == rule.id,
            AlertEvent.triggered_at >= cutoff,
        )
    )
    return (result.scalar() or 0) > 0


async def _evaluate_rule(db: AsyncSession, rule: AlertRule) -> tuple[bool, dict]:
    """Evaluate a single rule. Returns (triggered, context_dict)."""
    evaluators = {
        "concurrent_streams": _eval_concurrent_streams,
        "new_device": _eval_new_device,
        "sharing_score_threshold": _eval_sharing_score,
        "watch_threshold": _eval_watch_threshold,
        "inactive_user": _eval_inactive_user,
    }

    evaluator = evaluators.get(rule.condition_type)
    if not evaluator:
        logger.warning("Unknown condition type: %s", rule.condition_type)
        return False, {}

    return await evaluator(db, rule.condition_config)


async def _eval_concurrent_streams(db: AsyncSession, config: dict) -> tuple[bool, dict]:
    """Alert when a user has more concurrent streams than max_streams."""
    max_streams = config.get("max_streams", 2)

    query = (
        select(
            PlaybackSession.user_id,
            MediaServerUser.username,
            func.count(PlaybackSession.id).label("stream_count"),
        )
        .join(MediaServerUser, PlaybackSession.user_id == MediaServerUser.id)
        .group_by(PlaybackSession.user_id, MediaServerUser.username)
        .having(func.count(PlaybackSession.id) > max_streams)
    )
    result = await db.execute(query)
    rows = result.all()

    if rows:
        users = [{"username": r.username, "streams": r.stream_count} for r in rows]
        return True, {
            "summary": f"{len(users)} user(s) exceeding {max_streams} concurrent streams",
            "users": users,
        }
    return False, {}


async def _eval_new_device(db: AsyncSession, config: dict) -> tuple[bool, dict]:
    """Alert when a new device is seen in the last N hours."""
    lookback_hours = config.get("lookback_hours", 24)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=lookback_hours)

    query = (
        select(DeviceFingerprint)
        .join(MediaServerUser, DeviceFingerprint.user_id == MediaServerUser.id)
        .where(DeviceFingerprint.first_seen_at >= cutoff)
    )
    result = await db.execute(query)
    new_devices = result.scalars().all()

    if new_devices:
        devices = [
            {"device_name": d.device_name, "client": d.client_name, "user_id": str(d.user_id)}
            for d in new_devices
        ]
        return True, {
            "summary": f"{len(devices)} new device(s) detected in last {lookback_hours}h",
            "devices": devices,
        }
    return False, {}


async def _eval_sharing_score(db: AsyncSession, config: dict) -> tuple[bool, dict]:
    """Alert when any user's sharing score exceeds threshold."""
    min_score = config.get("min_score", 70)

    query = (
        select(SharingScore, MediaServerUser.username)
        .join(MediaServerUser, SharingScore.user_id == MediaServerUser.id)
        .where(SharingScore.overall_score >= min_score)
        .order_by(SharingScore.overall_score.desc())
    )
    result = await db.execute(query)
    rows = result.all()

    if rows:
        users = [{"username": r[1], "score": round(r[0].overall_score, 1)} for r in rows]
        return True, {
            "summary": f"{len(users)} user(s) with sharing score >= {min_score}",
            "users": users,
        }
    return False, {}


async def _eval_watch_threshold(db: AsyncSession, config: dict) -> tuple[bool, dict]:
    """Alert when a user has watched more than max_hours in the last 24h."""
    max_hours = config.get("max_hours_per_day", 12)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

    from app.models.session import SessionHistory

    query = (
        select(
            MediaServerUser.username,
            func.sum(SessionHistory.play_duration_sec).label("total_sec"),
        )
        .join(MediaServerUser, SessionHistory.user_id == MediaServerUser.id)
        .where(SessionHistory.started_at >= cutoff)
        .group_by(MediaServerUser.username)
        .having(func.sum(SessionHistory.play_duration_sec) > max_hours * 3600)
    )
    result = await db.execute(query)
    rows = result.all()

    if rows:
        users = [
            {"username": r.username, "hours": round(r.total_sec / 3600, 1)}
            for r in rows
        ]
        return True, {
            "summary": f"{len(users)} user(s) watched > {max_hours}h in last 24h",
            "users": users,
        }
    return False, {}


async def _eval_inactive_user(db: AsyncSession, config: dict) -> tuple[bool, dict]:
    """Alert when active streams are detected from previously inactive users."""
    inactive_days = config.get("inactive_days", 30)
    cutoff = datetime.now(timezone.utc) - timedelta(days=inactive_days)

    query = (
        select(MediaServerUser.username)
        .join(PlaybackSession, PlaybackSession.user_id == MediaServerUser.id)
        .where(
            (MediaServerUser.last_activity_at < cutoff) | (MediaServerUser.last_activity_at.is_(None))
        )
    )
    result = await db.execute(query)
    rows = result.all()

    if rows:
        users = [r[0] for r in rows]
        return True, {
            "summary": f"{len(users)} previously inactive user(s) now streaming",
            "users": users,
        }
    return False, {}
