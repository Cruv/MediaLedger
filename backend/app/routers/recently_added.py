from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.library import Library, LibraryItem
from app.models.server import Server
from app.schemas.recently_added import (
    NewsletterPreview,
    RecentlyAddedItem,
    RecentlyAddedResponse,
)

router = APIRouter()


async def _fetch_recent_items(
    db: AsyncSession,
    days: int,
    server_id: str | None = None,
    library_type: str | None = None,
    limit: int = 200,
) -> list[RecentlyAddedItem]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    query = (
        select(LibraryItem, Library.name.label("library_name"), Server.name.label("server_name"))
        .join(Library, LibraryItem.library_id == Library.id)
        .join(Server, LibraryItem.server_id == Server.id)
        .where(LibraryItem.added_at >= cutoff)
        .order_by(LibraryItem.added_at.desc())
        .limit(limit)
    )
    if server_id:
        query = query.where(LibraryItem.server_id == server_id)
    if library_type:
        query = query.where(Library.library_type == library_type)

    result = await db.execute(query)
    rows = result.all()
    return [
        RecentlyAddedItem(
            id=str(r[0].id),
            title=r[0].title,
            item_type=r[0].item_type,
            year=r[0].year,
            season_number=r[0].season_number,
            episode_number=r[0].episode_number,
            runtime_ticks=r[0].runtime_ticks,
            added_at=r[0].added_at,
            genres=r[0].genres,
            thumb_url=r[0].thumb_url,
            library_name=r[1],
            server_name=r[2],
        )
        for r in rows
    ]


@router.get("/", response_model=RecentlyAddedResponse)
async def get_recently_added(
    days: int = Query(7, ge=1, le=90),
    server_id: str | None = None,
    library_type: str | None = None,
    limit: int = Query(200, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
):
    """Get items recently added across all libraries."""
    items = await _fetch_recent_items(db, days, server_id, library_type, limit)
    return RecentlyAddedResponse(items=items, total=len(items), days=days)


@router.get("/newsletter", response_model=NewsletterPreview)
async def get_newsletter_preview(
    days: int = Query(7, ge=1, le=90),
    server_id: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Generate an HTML newsletter preview of recently added content."""
    items = await _fetch_recent_items(db, days, server_id)

    # Group items by type
    movies = [i for i in items if i.item_type in ("Movie",)]
    episodes = [i for i in items if i.item_type in ("Episode",)]
    other = [i for i in items if i.item_type not in ("Movie", "Episode")]

    html = _build_newsletter_html(movies, episodes, other, days)
    return NewsletterPreview(html=html, item_count=len(items), period_days=days)


@router.post("/newsletter/send", status_code=202)
async def send_newsletter(
    days: int = Query(7, ge=1, le=90),
    server_id: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Send the newsletter via all enabled notification agents with 'newsletter' trigger."""
    from app.models.notification import NotificationAgent
    from app.notifications.agents import create_agent

    items = await _fetch_recent_items(db, days, server_id)
    movies = [i for i in items if i.item_type in ("Movie",)]
    episodes = [i for i in items if i.item_type in ("Episode",)]
    other = [i for i in items if i.item_type not in ("Movie", "Episode")]
    html = _build_newsletter_html(movies, episodes, other, days)

    # Find enabled agents with newsletter trigger
    result = await db.execute(
        select(NotificationAgent).where(
            NotificationAgent.is_enabled == True,
        )
    )
    agents = result.scalars().all()
    newsletter_agents = [a for a in agents if "newsletter" in (a.triggers or [])]

    sent = 0
    for agent_row in newsletter_agents:
        try:
            agent = create_agent(agent_row.agent_type, agent_row.config_json)
            await agent.send(
                subject=f"Recently Added - Last {days} Days",
                body=html,
            )
            sent += 1
        except Exception:
            pass

    return {"message": f"Newsletter sent via {sent}/{len(newsletter_agents)} agents", "item_count": len(items)}


def _build_newsletter_html(
    movies: list[RecentlyAddedItem],
    episodes: list[RecentlyAddedItem],
    other: list[RecentlyAddedItem],
    days: int,
) -> str:
    sections = []

    if movies:
        rows = ""
        for m in movies:
            genres_str = ", ".join(m.genres) if m.genres else ""
            year_str = f" ({m.year})" if m.year else ""
            added = m.added_at.strftime("%b %d") if m.added_at else ""
            rows += f"""
            <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #374151;">{m.title}{year_str}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #374151;color:#9ca3af;">{genres_str}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #374151;color:#9ca3af;">{m.library_name}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #374151;color:#9ca3af;">{added}</td>
            </tr>"""
        sections.append(f"""
        <h2 style="color:#818cf8;margin:24px 0 12px;">Movies ({len(movies)})</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead><tr style="text-align:left;color:#6b7280;">
                <th style="padding:8px 12px;border-bottom:2px solid #374151;">Title</th>
                <th style="padding:8px 12px;border-bottom:2px solid #374151;">Genres</th>
                <th style="padding:8px 12px;border-bottom:2px solid #374151;">Library</th>
                <th style="padding:8px 12px;border-bottom:2px solid #374151;">Added</th>
            </tr></thead>
            <tbody>{rows}</tbody>
        </table>""")

    if episodes:
        rows = ""
        for e in episodes:
            ep_str = ""
            if e.season_number is not None and e.episode_number is not None:
                ep_str = f" S{e.season_number:02d}E{e.episode_number:02d}"
            added = e.added_at.strftime("%b %d") if e.added_at else ""
            rows += f"""
            <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #374151;">{e.title}{ep_str}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #374151;color:#9ca3af;">{e.library_name}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #374151;color:#9ca3af;">{added}</td>
            </tr>"""
        sections.append(f"""
        <h2 style="color:#818cf8;margin:24px 0 12px;">TV Episodes ({len(episodes)})</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead><tr style="text-align:left;color:#6b7280;">
                <th style="padding:8px 12px;border-bottom:2px solid #374151;">Title</th>
                <th style="padding:8px 12px;border-bottom:2px solid #374151;">Library</th>
                <th style="padding:8px 12px;border-bottom:2px solid #374151;">Added</th>
            </tr></thead>
            <tbody>{rows}</tbody>
        </table>""")

    if other:
        rows = ""
        for o in other:
            added = o.added_at.strftime("%b %d") if o.added_at else ""
            rows += f"""
            <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #374151;">{o.title}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #374151;color:#9ca3af;">{o.item_type}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #374151;color:#9ca3af;">{o.library_name}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #374151;color:#9ca3af;">{added}</td>
            </tr>"""
        sections.append(f"""
        <h2 style="color:#818cf8;margin:24px 0 12px;">Other ({len(other)})</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead><tr style="text-align:left;color:#6b7280;">
                <th style="padding:8px 12px;border-bottom:2px solid #374151;">Title</th>
                <th style="padding:8px 12px;border-bottom:2px solid #374151;">Type</th>
                <th style="padding:8px 12px;border-bottom:2px solid #374151;">Library</th>
                <th style="padding:8px 12px;border-bottom:2px solid #374151;">Added</th>
            </tr></thead>
            <tbody>{rows}</tbody>
        </table>""")

    total = len(movies) + len(episodes) + len(other)
    content = "\n".join(sections) if sections else '<p style="color:#9ca3af;">No new content added in this period.</p>'

    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#111827;color:#e5e7eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:700px;margin:0 auto;padding:24px;">
    <div style="text-align:center;margin-bottom:32px;">
        <div style="display:inline-block;background:#4f46e5;border-radius:12px;padding:8px 16px;color:white;font-weight:bold;font-size:20px;margin-bottom:8px;">ML</div>
        <h1 style="color:white;margin:8px 0 4px;">Recently Added</h1>
        <p style="color:#9ca3af;margin:0;">Last {days} days &middot; {total} items</p>
    </div>
    {content}
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #374151;text-align:center;">
        <p style="color:#6b7280;font-size:12px;">Generated by MediaLedger</p>
    </div>
</div>
</body>
</html>"""
