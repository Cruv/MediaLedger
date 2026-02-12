"""IP diversity analyzer — scores how geographically spread a user's IPs are."""
import logging
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sharing import IPLog
from app.sharing_engine.geo import haversine_km

logger = logging.getLogger(__name__)


async def analyze_ip_diversity(
    db: AsyncSession,
    user_id: str,
    window_start: datetime,
    window_end: datetime,
) -> tuple[float, dict]:
    """
    Returns (score 0-100, evidence dict).
    Signals: unique IP count, geographic spread, VPN usage.
    """
    result = await db.execute(
        select(IPLog).where(
            IPLog.user_id == user_id,
            IPLog.last_seen_at >= window_start,
            IPLog.last_seen_at <= window_end,
        )
    )
    ip_logs = result.scalars().all()

    if len(ip_logs) <= 1:
        return 0.0, {"unique_ips": len(ip_logs), "reason": "single_or_no_ip"}

    unique_ips = len(ip_logs)
    vpn_count = sum(1 for ip in ip_logs if ip.is_vpn)

    # Calculate max geographic distance between any two IPs
    coords = [
        (ip.geo_lat, ip.geo_lon)
        for ip in ip_logs
        if ip.geo_lat is not None and ip.geo_lon is not None
    ]
    max_distance_km = 0.0
    for i in range(len(coords)):
        for j in range(i + 1, len(coords)):
            d = haversine_km(coords[i][0], coords[i][1], coords[j][0], coords[j][1])
            max_distance_km = max(max_distance_km, d)

    unique_countries = len({ip.geo_country for ip in ip_logs if ip.geo_country})
    unique_cities = len({ip.geo_city for ip in ip_logs if ip.geo_city})

    # Scoring
    score = 0.0

    # Unique IP count factor (2-3 is normal, 5+ suspicious, 10+ very suspicious)
    if unique_ips >= 10:
        score += 35
    elif unique_ips >= 5:
        score += 25
    elif unique_ips >= 3:
        score += 10

    # Geographic spread factor
    if max_distance_km > 500:
        score += 30
    elif max_distance_km > 100:
        score += 20
    elif max_distance_km > 30:
        score += 10

    # Multi-country factor
    if unique_countries >= 3:
        score += 20
    elif unique_countries >= 2:
        score += 10

    # VPN usage (not inherently suspicious, but a signal)
    if vpn_count >= 2:
        score += 15
    elif vpn_count >= 1:
        score += 5

    score = min(score, 100.0)

    evidence = {
        "unique_ips": unique_ips,
        "unique_countries": unique_countries,
        "unique_cities": unique_cities,
        "max_distance_km": round(max_distance_km, 1),
        "vpn_count": vpn_count,
        "top_ips": [
            {"ip": str(ip.ip_address), "city": ip.geo_city, "hits": ip.hit_count}
            for ip in sorted(ip_logs, key=lambda x: x.hit_count, reverse=True)[:5]
        ],
    }

    return score, evidence
