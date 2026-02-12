import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.sharing import IPLog
from app.models.user import MediaServerUser
from app.models.server import Server

router = APIRouter()


@router.get("/map-data")
async def get_map_data(
    user_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Get IP geolocation data for map rendering.

    Returns clustered location data with user counts and metadata.
    Optional user_id filter for per-user view.
    """
    query = (
        select(
            IPLog.geo_lat,
            IPLog.geo_lon,
            IPLog.geo_city,
            IPLog.geo_region,
            IPLog.geo_country,
            IPLog.ip_address,
            IPLog.hit_count,
            IPLog.last_seen_at,
            IPLog.is_vpn,
            MediaServerUser.username,
            MediaServerUser.id.label("user_id"),
            Server.name.label("server_name"),
        )
        .join(MediaServerUser, IPLog.user_id == MediaServerUser.id)
        .join(Server, IPLog.server_id == Server.id)
        .where(IPLog.geo_lat.isnot(None), IPLog.geo_lon.isnot(None))
    )

    if user_id:
        query = query.where(IPLog.user_id == user_id)

    query = query.order_by(IPLog.last_seen_at.desc()).limit(5000)

    result = await db.execute(query)
    rows = result.all()

    points = []
    for r in rows:
        points.append({
            "lat": r.geo_lat,
            "lon": r.geo_lon,
            "city": r.geo_city,
            "region": r.geo_region,
            "country": r.geo_country,
            "ip": str(r.ip_address),
            "hits": r.hit_count,
            "last_seen": r.last_seen_at.isoformat() if r.last_seen_at else None,
            "is_vpn": r.is_vpn,
            "username": r.username,
            "user_id": str(r.user_id),
            "server": r.server_name,
        })

    return {"points": points, "total": len(points)}


@router.get("/stats")
async def get_geo_stats(db: AsyncSession = Depends(get_db)):
    """Get high-level geo statistics for the dashboard."""
    # Total unique IPs with geo
    total_geo = await db.execute(
        select(func.count(IPLog.id)).where(IPLog.geo_lat.isnot(None))
    )
    # Total unique IPs without geo
    total_no_geo = await db.execute(
        select(func.count(IPLog.id)).where(IPLog.geo_lat.is_(None))
    )
    # Country breakdown
    countries = await db.execute(
        select(IPLog.geo_country, func.count(func.distinct(IPLog.ip_address)))
        .where(IPLog.geo_country.isnot(None))
        .group_by(IPLog.geo_country)
        .order_by(func.count(func.distinct(IPLog.ip_address)).desc())
        .limit(20)
    )
    # VPN count
    vpn_count = await db.execute(
        select(func.count(IPLog.id)).where(IPLog.is_vpn == True)
    )
    # Unique users with geo
    user_count = await db.execute(
        select(func.count(func.distinct(IPLog.user_id))).where(IPLog.geo_lat.isnot(None))
    )

    return {
        "geolocated_ips": total_geo.scalar() or 0,
        "ungeolocated_ips": total_no_geo.scalar() or 0,
        "vpn_ips": vpn_count.scalar() or 0,
        "users_with_geo": user_count.scalar() or 0,
        "countries": [
            {"code": r[0], "count": r[1]} for r in countries.all()
        ],
    }


@router.post("/enrich", status_code=202)
async def enrich_ips(db: AsyncSession = Depends(get_db)):
    """Trigger geolocation enrichment for IPs missing geo data."""
    from app.sharing_engine.geo import geolocate

    result = await db.execute(
        select(IPLog).where(IPLog.geo_lat.is_(None)).limit(500)
    )
    ips = result.scalars().all()

    enriched = 0
    for ip_log in ips:
        geo = geolocate(str(ip_log.ip_address))
        if geo:
            ip_log.geo_country = geo.get("country")
            ip_log.geo_region = geo.get("region")
            ip_log.geo_city = geo.get("city")
            ip_log.geo_lat = geo.get("lat")
            ip_log.geo_lon = geo.get("lon")
            enriched += 1

    await db.commit()
    return {"enriched": enriched, "remaining": len(ips) - enriched}
