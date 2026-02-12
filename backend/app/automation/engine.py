"""Automation engine: evaluates conditions and executes actions."""

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete as sa_delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import log_action
from app.db.engine import async_session_factory
from app.models.automation import AutomationHistory, AutomationRule
from app.models.session import PlaybackSession, SessionHistory
from app.models.sharing import SharingScore
from app.models.tags import UserTag, UserTagAssignment
from app.models.user import MediaServerUser

logger = logging.getLogger(__name__)


# ─── Condition evaluators ───
# Each returns a list of (user_id, username, context_dict) tuples for users that match

async def _cond_concurrent_streams(db: AsyncSession, config: dict) -> list[tuple]:
    max_streams = config.get("max_streams", 2)
    query = (
        select(PlaybackSession.user_id, MediaServerUser.username, func.count(PlaybackSession.id).label("cnt"))
        .join(MediaServerUser, PlaybackSession.user_id == MediaServerUser.id)
        .group_by(PlaybackSession.user_id, MediaServerUser.username)
        .having(func.count(PlaybackSession.id) > max_streams)
    )
    rows = (await db.execute(query)).all()
    return [(r[0], r[1], {"streams": r[2], "max": max_streams}) for r in rows]


async def _cond_sharing_score(db: AsyncSession, config: dict) -> list[tuple]:
    min_score = config.get("min_score", 70)
    query = (
        select(SharingScore.user_id, MediaServerUser.username, SharingScore.overall_score)
        .join(MediaServerUser, SharingScore.user_id == MediaServerUser.id)
        .where(SharingScore.overall_score >= min_score)
    )
    rows = (await db.execute(query)).all()
    return [(r[0], r[1], {"score": round(r[2], 1), "threshold": min_score}) for r in rows]


async def _cond_watch_hours(db: AsyncSession, config: dict) -> list[tuple]:
    max_hours = config.get("max_hours_per_day", 12)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    query = (
        select(SessionHistory.user_id, MediaServerUser.username, func.sum(SessionHistory.play_duration_sec).label("total"))
        .join(MediaServerUser, SessionHistory.user_id == MediaServerUser.id)
        .where(SessionHistory.started_at >= cutoff)
        .group_by(SessionHistory.user_id, MediaServerUser.username)
        .having(func.sum(SessionHistory.play_duration_sec) > max_hours * 3600)
    )
    rows = (await db.execute(query)).all()
    return [(r[0], r[1], {"hours": round(r[2] / 3600, 1), "max": max_hours}) for r in rows]


async def _cond_inactive_streaming(db: AsyncSession, config: dict) -> list[tuple]:
    inactive_days = config.get("inactive_days", 30)
    cutoff = datetime.now(timezone.utc) - timedelta(days=inactive_days)
    query = (
        select(MediaServerUser.id, MediaServerUser.username)
        .join(PlaybackSession, PlaybackSession.user_id == MediaServerUser.id)
        .where((MediaServerUser.last_activity_at < cutoff) | (MediaServerUser.last_activity_at.is_(None)))
    )
    rows = (await db.execute(query)).all()
    return [(r[0], r[1], {"inactive_days": inactive_days}) for r in rows]


CONDITION_EVALUATORS = {
    "concurrent_streams": _cond_concurrent_streams,
    "sharing_score": _cond_sharing_score,
    "watch_hours": _cond_watch_hours,
    "inactive_streaming": _cond_inactive_streaming,
}


# ─── Action executors ───
# Each takes (db, user_id, username, action_config, context) and returns (success, error_msg)

async def _action_kill_sessions(db: AsyncSession, user_id, username, config, context) -> tuple[bool, str | None]:
    """Delete all active playback sessions for the user."""
    result = await db.execute(
        sa_delete(PlaybackSession).where(PlaybackSession.user_id == user_id)
    )
    count = result.rowcount
    await log_action(db, "automation.kill_sessions", "user", str(user_id), username,
                     {"sessions_killed": count})
    return True, None


async def _action_disable_user(db: AsyncSession, user_id, username, config, context) -> tuple[bool, str | None]:
    """Disable the media server user account."""
    user = await db.get(MediaServerUser, user_id)
    if not user:
        return False, "User not found"
    if user.is_disabled:
        return True, None  # already disabled
    user.is_disabled = True
    await log_action(db, "automation.user_disabled", "user", str(user_id), username, context)
    return True, None


async def _action_add_tag(db: AsyncSession, user_id, username, config, context) -> tuple[bool, str | None]:
    """Add a tag to the user."""
    tag_name = config.get("tag_name")
    if not tag_name:
        return False, "No tag_name in action config"
    result = await db.execute(select(UserTag).where(UserTag.name == tag_name))
    tag = result.scalar_one_or_none()
    if not tag:
        return False, f"Tag '{tag_name}' not found"
    # Check if already assigned
    existing = await db.execute(
        select(UserTagAssignment).where(
            UserTagAssignment.user_id == user_id,
            UserTagAssignment.tag_id == tag.id,
        )
    )
    if not existing.scalar_one_or_none():
        db.add(UserTagAssignment(user_id=user_id, tag_id=tag.id))
        await log_action(db, "automation.tag_added", "user", str(user_id), username,
                         {"tag": tag_name})
    return True, None


async def _action_remove_tag(db: AsyncSession, user_id, username, config, context) -> tuple[bool, str | None]:
    """Remove a tag from the user."""
    tag_name = config.get("tag_name")
    if not tag_name:
        return False, "No tag_name in action config"
    result = await db.execute(select(UserTag).where(UserTag.name == tag_name))
    tag = result.scalar_one_or_none()
    if not tag:
        return False, f"Tag '{tag_name}' not found"
    await db.execute(
        sa_delete(UserTagAssignment).where(
            UserTagAssignment.user_id == user_id,
            UserTagAssignment.tag_id == tag.id,
        )
    )
    await log_action(db, "automation.tag_removed", "user", str(user_id), username,
                     {"tag": tag_name})
    return True, None


async def _action_notify(db: AsyncSession, user_id, username, config, context) -> tuple[bool, str | None]:
    """Send a notification via enabled agents."""
    from app.models.notification import NotificationAgent
    from app.notifications.agents import create_agent

    message = config.get("message", "Automation rule triggered for {username}")
    message = message.replace("{username}", username or "Unknown")

    result = await db.execute(
        select(NotificationAgent).where(NotificationAgent.is_enabled == True)
    )
    agents = result.scalars().all()

    sent = 0
    for agent_row in agents:
        try:
            agent = create_agent(agent_row.agent_type, agent_row.config_json)
            await agent.send(subject=f"Automation: {message[:50]}", body=message)
            sent += 1
        except Exception:
            pass

    return True, None if sent > 0 else f"Sent to {sent} agents"


ACTION_EXECUTORS = {
    "kill_sessions": _action_kill_sessions,
    "disable_user": _action_disable_user,
    "add_tag": _action_add_tag,
    "remove_tag": _action_remove_tag,
    "notify": _action_notify,
}


# ─── Main engine ───

async def run_automation():
    """Evaluate all enabled automation rules and execute actions."""
    async with async_session_factory() as db:
        result = await db.execute(
            select(AutomationRule).where(AutomationRule.is_enabled == True)
        )
        rules = result.scalars().all()

        for rule in rules:
            try:
                # Check cooldown
                cutoff = datetime.now(timezone.utc) - timedelta(minutes=rule.cooldown_minutes)
                cooldown_check = await db.execute(
                    select(func.count(AutomationHistory.id)).where(
                        AutomationHistory.rule_id == rule.id,
                        AutomationHistory.executed_at >= cutoff,
                    )
                )
                if (cooldown_check.scalar() or 0) > 0:
                    continue

                # Evaluate condition
                evaluator = CONDITION_EVALUATORS.get(rule.condition_type)
                if not evaluator:
                    logger.warning("Unknown condition type: %s", rule.condition_type)
                    continue

                matches = await evaluator(db, rule.condition_config)
                if not matches:
                    continue

                # Execute action for each matched user
                executor = ACTION_EXECUTORS.get(rule.action_type)
                if not executor:
                    logger.warning("Unknown action type: %s", rule.action_type)
                    continue

                for user_id, username, context in matches:
                    try:
                        success, error = await executor(db, user_id, username, rule.action_config, context)
                        history = AutomationHistory(
                            rule_id=rule.id,
                            action_taken=rule.action_type,
                            target_user_id=user_id,
                            target_username=username,
                            context=context,
                            success=success,
                            error_message=error,
                        )
                        db.add(history)
                        await db.commit()
                        logger.info("Automation %s: %s on %s", rule.name, rule.action_type, username)
                    except Exception:
                        logger.exception("Error executing automation %s for %s", rule.name, username)
                        await db.rollback()

            except Exception:
                logger.exception("Error evaluating automation rule %s", rule.name)
                await db.rollback()
