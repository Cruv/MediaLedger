"""Main sharing analysis orchestrator with composite weighted scoring."""
import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import async_session_factory
from app.models.sharing import SharingScore
from app.models.user import MediaServerUser
from app.sharing_engine.concurrency_analyzer import analyze_concurrency
from app.sharing_engine.cross_server_analyzer import analyze_cross_server
from app.sharing_engine.device_analyzer import analyze_devices
from app.sharing_engine.ip_analyzer import analyze_ip_diversity
from app.sharing_engine.pattern_analyzer import analyze_patterns

logger = logging.getLogger(__name__)

# Default analyzer weights (configurable)
DEFAULT_WEIGHTS = {
    "ip": 0.25,
    "concurrency": 0.30,
    "pattern": 0.20,
    "device": 0.15,
    "cross_server": 0.10,
}


class SharingAnalyzer:
    """Orchestrates all 5 sharing analyzers and computes a composite score."""

    def __init__(self, weights: dict[str, float] | None = None):
        self.weights = weights or DEFAULT_WEIGHTS

    async def analyze_user(
        self,
        db: AsyncSession,
        user_id: str,
        window_days: int = 30,
    ) -> SharingScore:
        """Run all analyzers for a user and persist the composite score."""
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(days=window_days)
        window_end = now

        # Run all 5 analyzers
        ip_score, ip_evidence = await analyze_ip_diversity(db, user_id, window_start, window_end)
        conc_score, conc_evidence = await analyze_concurrency(db, user_id, window_start, window_end)
        pattern_score, pattern_evidence = await analyze_patterns(db, user_id, window_start, window_end)
        device_score, device_evidence = await analyze_devices(db, user_id, window_start, window_end)
        cross_score, cross_evidence = await analyze_cross_server(db, user_id, window_start, window_end)

        # Composite weighted score
        overall = (
            ip_score * self.weights["ip"]
            + conc_score * self.weights["concurrency"]
            + pattern_score * self.weights["pattern"]
            + device_score * self.weights["device"]
            + cross_score * self.weights["cross_server"]
        )
        overall = round(min(overall, 100.0), 1)

        evidence = {
            "ip": ip_evidence,
            "concurrency": conc_evidence,
            "pattern": pattern_evidence,
            "device": device_evidence,
            "cross_server": cross_evidence,
            "weights": self.weights,
        }

        # Upsert sharing score
        score_obj = SharingScore(
            user_id=uuid.UUID(user_id),
            overall_score=overall,
            ip_diversity_score=round(ip_score, 1),
            concurrency_score=round(conc_score, 1),
            pattern_score=round(pattern_score, 1),
            device_score=round(device_score, 1),
            cross_server_score=round(cross_score, 1),
            analysis_window_start=window_start,
            analysis_window_end=window_end,
            evidence_json=evidence,
            computed_at=now,
        )

        # Check if score already exists for this user
        existing = await db.execute(
            select(SharingScore).where(SharingScore.user_id == user_id)
        )
        existing_score = existing.scalar_one_or_none()
        if existing_score:
            existing_score.overall_score = overall
            existing_score.ip_diversity_score = round(ip_score, 1)
            existing_score.concurrency_score = round(conc_score, 1)
            existing_score.pattern_score = round(pattern_score, 1)
            existing_score.device_score = round(device_score, 1)
            existing_score.cross_server_score = round(cross_score, 1)
            existing_score.analysis_window_start = window_start
            existing_score.analysis_window_end = window_end
            existing_score.evidence_json = evidence
            existing_score.computed_at = now
            score_obj = existing_score
        else:
            db.add(score_obj)

        await db.flush()

        logger.info(
            "Sharing score for user %s: overall=%.1f (ip=%.1f conc=%.1f pat=%.1f dev=%.1f cross=%.1f)",
            user_id, overall, ip_score, conc_score, pattern_score, device_score, cross_score,
        )

        return score_obj

    async def analyze_all_users(self, window_days: int = 30):
        """Run sharing analysis for all active users."""
        async with async_session_factory() as db:
            result = await db.execute(
                select(MediaServerUser.id).where(MediaServerUser.is_disabled == False)
            )
            user_ids = [str(r[0]) for r in result.all()]

            analyzed = 0
            for uid in user_ids:
                try:
                    await self.analyze_user(db, uid, window_days)
                    analyzed += 1
                except Exception:
                    logger.exception("Failed to analyze user %s", uid)

            await db.commit()
            logger.info("Sharing analysis complete: %d/%d users", analyzed, len(user_ids))
