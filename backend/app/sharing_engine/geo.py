"""Geolocation utilities using MaxMind GeoLite2."""
import logging
import math
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

_reader = None


def _get_reader():
    """Lazy-load the GeoIP2 reader."""
    global _reader
    if _reader is not None:
        return _reader
    try:
        import geoip2.database
        from app.config import settings
        db_path = Path(settings.geoip_db_path)
        if db_path.exists():
            _reader = geoip2.database.Reader(str(db_path))
            logger.info("GeoIP2 database loaded from %s", db_path)
        else:
            logger.warning("GeoIP2 database not found at %s", db_path)
    except ImportError:
        logger.info("geoip2 not installed, geolocation disabled")
    return _reader


def geolocate(ip: str) -> Optional[dict]:
    """Return geo info for an IP, or None."""
    reader = _get_reader()
    if not reader:
        return None
    try:
        resp = reader.city(ip)
        return {
            "country": resp.country.iso_code,
            "region": resp.subdivisions.most_specific.name if resp.subdivisions else None,
            "city": resp.city.name,
            "lat": resp.location.latitude,
            "lon": resp.location.longitude,
        }
    except Exception:
        return None


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two lat/lon points in kilometers."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
