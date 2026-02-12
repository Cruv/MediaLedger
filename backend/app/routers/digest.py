"""Weekly admin digest: compiles server stats and sends via notification agents."""

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import async_session_factory
from app.db.session import get_db
from app.models.alerts import AlertEvent
from app.models.automation import AutomationHistory
from app.models.library import LibraryItem
from app.models.server import Server
from app.models.session import SessionHistory
from app.models.sharing import SharingScore
from app.models.user import MediaServerUser

logger = logging.getLogger(__name__)

router = APIRouter()


async def _compile_digest(db: AsyncSession, days: int = 7) -> dict:
    """Gather all stats for the digest period."""
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=days)

    # Active users (had at least one session)
    active_users = await db.execute(
        select(func.count(func.distinct(SessionHistory.user_id)))
        .where(SessionHistory.started_at >= cutoff)
    )
    active_users_count = active_users.scalar() or 0

    # Total sessions
    total_sessions = await db.execute(
        select(func.count(SessionHistory.id))
        .where(SessionHistory.started_at >= cutoff)
    )
    total_sessions_count = total_sessions.scalar() or 0

    # Total watch time in hours
    total_watch = await db.execute(
        select(func.coalesce(func.sum(SessionHistory.play_duration_sec), 0))
        .where(SessionHistory.started_at >= cutoff)
    )
    total_watch_hours = round((total_watch.scalar() or 0) / 3600, 1)

    # Top watchers
    top_watchers_q = await db.execute(
        select(
            MediaServerUser.username,
            func.sum(SessionHistory.play_duration_sec).label("total_sec"),
            func.count(SessionHistory.id).label("session_count"),
        )
        .join(MediaServerUser, SessionHistory.user_id == MediaServerUser.id)
        .where(SessionHistory.started_at >= cutoff)
        .group_by(MediaServerUser.username)
        .order_by(func.sum(SessionHistory.play_duration_sec).desc())
        .limit(10)
    )
    top_watchers = [
        {
            "username": r[0],
            "hours": round(r[1] / 3600, 1),
            "sessions": r[2],
        }
        for r in top_watchers_q.all()
    ]

    # Most played content
    top_content_q = await db.execute(
        select(
            SessionHistory.grandparent_title,
            SessionHistory.item_title,
            SessionHistory.item_type,
            func.count(SessionHistory.id).label("plays"),
        )
        .where(SessionHistory.started_at >= cutoff)
        .group_by(
            SessionHistory.grandparent_title,
            SessionHistory.item_title,
            SessionHistory.item_type,
        )
        .order_by(func.count(SessionHistory.id).desc())
        .limit(10)
    )
    top_content = [
        {
            "title": r.grandparent_title or r.item_title or "Unknown",
            "subtitle": r.item_title if r.grandparent_title else None,
            "type": r.item_type,
            "plays": r.plays,
        }
        for r in top_content_q.all()
    ]

    # New library items
    new_items = await db.execute(
        select(func.count(LibraryItem.id))
        .where(LibraryItem.added_at >= cutoff)
    )
    new_items_count = new_items.scalar() or 0

    # Total registered users
    total_users = await db.execute(
        select(func.count(MediaServerUser.id))
    )
    total_users_count = total_users.scalar() or 0

    # Servers
    servers_q = await db.execute(
        select(Server.name, Server.server_type, Server.last_seen_at)
        .where(Server.is_active == True)
    )
    servers = [
        {
            "name": r.name,
            "type": r.server_type,
            "last_seen": r.last_seen_at.isoformat() if r.last_seen_at else None,
        }
        for r in servers_q.all()
    ]

    # Alert events
    alert_count = await db.execute(
        select(func.count(AlertEvent.id))
        .where(AlertEvent.triggered_at >= cutoff)
    )
    unresolved_alerts = await db.execute(
        select(func.count(AlertEvent.id))
        .where(AlertEvent.resolved == False)
    )

    # Automation executions
    automation_count = await db.execute(
        select(func.count(AutomationHistory.id))
        .where(AutomationHistory.executed_at >= cutoff)
    )
    automation_failures = await db.execute(
        select(func.count(AutomationHistory.id))
        .where(
            AutomationHistory.executed_at >= cutoff,
            AutomationHistory.success == False,
        )
    )

    # Sharing scores summary
    high_sharing = await db.execute(
        select(func.count(SharingScore.id))
        .where(SharingScore.overall_score >= 50)
    )

    return {
        "period_days": days,
        "generated_at": now.isoformat(),
        "active_users": active_users_count,
        "total_users": total_users_count,
        "total_sessions": total_sessions_count,
        "total_watch_hours": total_watch_hours,
        "new_library_items": new_items_count,
        "top_watchers": top_watchers,
        "top_content": top_content,
        "servers": servers,
        "alerts_triggered": alert_count.scalar() or 0,
        "alerts_unresolved": unresolved_alerts.scalar() or 0,
        "automation_executions": automation_count.scalar() or 0,
        "automation_failures": automation_failures.scalar() or 0,
        "high_sharing_users": high_sharing.scalar() or 0,
    }


def _build_digest_html(data: dict) -> str:
    """Build an HTML email from digest data."""
    # Top watchers rows
    watcher_rows = ""
    for w in data["top_watchers"]:
        watcher_rows += f"""
        <tr>
            <td style="padding:6px 12px;border-bottom:1px solid #374151;">{w['username']}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #374151;color:#9ca3af;text-align:right;">{w['hours']}h</td>
            <td style="padding:6px 12px;border-bottom:1px solid #374151;color:#9ca3af;text-align:right;">{w['sessions']}</td>
        </tr>"""

    # Top content rows
    content_rows = ""
    for c in data["top_content"]:
        title = c["title"]
        if c.get("subtitle"):
            title += f' <span style="color:#9ca3af;">- {c["subtitle"]}</span>'
        content_rows += f"""
        <tr>
            <td style="padding:6px 12px;border-bottom:1px solid #374151;">{title}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #374151;color:#9ca3af;">{c['type'] or ''}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #374151;color:#9ca3af;text-align:right;">{c['plays']}</td>
        </tr>"""

    # Server rows
    server_rows = ""
    for s in data["servers"]:
        server_rows += f"""
        <tr>
            <td style="padding:6px 12px;border-bottom:1px solid #374151;">{s['name']}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #374151;color:#9ca3af;">{s['type']}</td>
        </tr>"""

    # Alerts/automation section
    alerts_color = "#ef4444" if data["alerts_unresolved"] > 0 else "#22c55e"
    automation_color = "#ef4444" if data["automation_failures"] > 0 else "#22c55e"

    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#111827;color:#e5e7eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:700px;margin:0 auto;padding:24px;">
    <div style="text-align:center;margin-bottom:32px;">
        <div style="display:inline-block;background:#4f46e5;border-radius:12px;padding:8px 16px;color:white;font-weight:bold;font-size:20px;margin-bottom:8px;">ML</div>
        <h1 style="color:white;margin:8px 0 4px;">Admin Digest</h1>
        <p style="color:#9ca3af;margin:0;">Last {data['period_days']} days</p>
    </div>

    <!-- Summary Cards -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
            <td style="padding:12px;background:#1f2937;border-radius:8px;text-align:center;width:25%;">
                <div style="font-size:24px;font-weight:bold;color:white;">{data['active_users']}</div>
                <div style="font-size:12px;color:#9ca3af;">Active Users</div>
            </td>
            <td style="width:8px;"></td>
            <td style="padding:12px;background:#1f2937;border-radius:8px;text-align:center;width:25%;">
                <div style="font-size:24px;font-weight:bold;color:white;">{data['total_sessions']}</div>
                <div style="font-size:12px;color:#9ca3af;">Sessions</div>
            </td>
            <td style="width:8px;"></td>
            <td style="padding:12px;background:#1f2937;border-radius:8px;text-align:center;width:25%;">
                <div style="font-size:24px;font-weight:bold;color:white;">{data['total_watch_hours']}</div>
                <div style="font-size:12px;color:#9ca3af;">Watch Hours</div>
            </td>
            <td style="width:8px;"></td>
            <td style="padding:12px;background:#1f2937;border-radius:8px;text-align:center;width:25%;">
                <div style="font-size:24px;font-weight:bold;color:white;">{data['new_library_items']}</div>
                <div style="font-size:12px;color:#9ca3af;">New Items</div>
            </td>
        </tr>
    </table>

    <!-- Operational Health -->
    <div style="background:#1f2937;border-radius:8px;padding:16px;margin-bottom:24px;">
        <h3 style="color:#818cf8;margin:0 0 12px;">Operational Health</h3>
        <table style="width:100%;font-size:14px;">
            <tr>
                <td style="padding:4px 0;color:#9ca3af;">Servers Online</td>
                <td style="text-align:right;font-weight:bold;">{len(data['servers'])}</td>
            </tr>
            <tr>
                <td style="padding:4px 0;color:#9ca3af;">Alerts Triggered</td>
                <td style="text-align:right;font-weight:bold;">{data['alerts_triggered']}</td>
            </tr>
            <tr>
                <td style="padding:4px 0;color:#9ca3af;">Unresolved Alerts</td>
                <td style="text-align:right;font-weight:bold;color:{alerts_color};">{data['alerts_unresolved']}</td>
            </tr>
            <tr>
                <td style="padding:4px 0;color:#9ca3af;">Automation Runs</td>
                <td style="text-align:right;font-weight:bold;">{data['automation_executions']}</td>
            </tr>
            <tr>
                <td style="padding:4px 0;color:#9ca3af;">Automation Failures</td>
                <td style="text-align:right;font-weight:bold;color:{automation_color};">{data['automation_failures']}</td>
            </tr>
            <tr>
                <td style="padding:4px 0;color:#9ca3af;">High Sharing Score Users</td>
                <td style="text-align:right;font-weight:bold;color:#f97316;">{data['high_sharing_users']}</td>
            </tr>
            <tr>
                <td style="padding:4px 0;color:#9ca3af;">Total Registered Users</td>
                <td style="text-align:right;font-weight:bold;">{data['total_users']}</td>
            </tr>
        </table>
    </div>

    <!-- Top Watchers -->
    {'<h2 style="color:#818cf8;margin:24px 0 12px;">Top Watchers</h2><table style="width:100%;border-collapse:collapse;font-size:14px;"><thead><tr style="text-align:left;color:#6b7280;"><th style="padding:6px 12px;border-bottom:2px solid #374151;">User</th><th style="padding:6px 12px;border-bottom:2px solid #374151;text-align:right;">Hours</th><th style="padding:6px 12px;border-bottom:2px solid #374151;text-align:right;">Sessions</th></tr></thead><tbody>' + watcher_rows + '</tbody></table>' if watcher_rows else ''}

    <!-- Top Content -->
    {'<h2 style="color:#818cf8;margin:24px 0 12px;">Most Played</h2><table style="width:100%;border-collapse:collapse;font-size:14px;"><thead><tr style="text-align:left;color:#6b7280;"><th style="padding:6px 12px;border-bottom:2px solid #374151;">Title</th><th style="padding:6px 12px;border-bottom:2px solid #374151;">Type</th><th style="padding:6px 12px;border-bottom:2px solid #374151;text-align:right;">Plays</th></tr></thead><tbody>' + content_rows + '</tbody></table>' if content_rows else ''}

    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #374151;text-align:center;">
        <p style="color:#6b7280;font-size:12px;">Generated by MediaLedger</p>
    </div>
</div>
</body>
</html>"""


@router.get("/preview")
async def preview_digest(
    days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
):
    """Generate a preview of the admin digest."""
    data = await _compile_digest(db, days)
    html = _build_digest_html(data)
    return {"html": html, "stats": data}


@router.post("/send", status_code=202)
async def send_digest(
    days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
):
    """Send the admin digest via configured notification agents."""
    from app.models.notification import NotificationAgent
    from app.notifications.agents import create_agent

    data = await _compile_digest(db, days)
    html = _build_digest_html(data)

    # Find agents with admin_digest trigger
    result = await db.execute(
        select(NotificationAgent).where(NotificationAgent.is_enabled == True)
    )
    agents = result.scalars().all()
    digest_agents = [a for a in agents if "admin_digest" in (a.triggers or [])]

    sent = 0
    for agent_row in digest_agents:
        try:
            agent = create_agent(agent_row.agent_type, agent_row.config_json)
            await agent.send(
                subject=f"MediaLedger Admin Digest - Last {days} Days",
                body=html,
            )
            sent += 1
        except Exception:
            logger.exception("Failed to send digest via %s", agent_row.name)

    return {
        "message": f"Digest sent via {sent}/{len(digest_agents)} agents",
        "stats_summary": {
            "active_users": data["active_users"],
            "sessions": data["total_sessions"],
            "watch_hours": data["total_watch_hours"],
        },
    }


async def send_weekly_digest():
    """Background job: compile and send the weekly admin digest."""
    async with async_session_factory() as db:
        from app.models.notification import NotificationAgent
        from app.notifications.agents import create_agent

        data = await _compile_digest(db, days=7)
        html = _build_digest_html(data)

        result = await db.execute(
            select(NotificationAgent).where(NotificationAgent.is_enabled == True)
        )
        agents = result.scalars().all()
        digest_agents = [a for a in agents if "admin_digest" in (a.triggers or [])]

        sent = 0
        for agent_row in digest_agents:
            try:
                agent = create_agent(agent_row.agent_type, agent_row.config_json)
                await agent.send(
                    subject="MediaLedger Weekly Admin Digest",
                    body=html,
                )
                sent += 1
            except Exception:
                logger.exception("Weekly digest failed for %s", agent_row.name)

        logger.info("Weekly digest sent via %d/%d agents", sent, len(digest_agents))
