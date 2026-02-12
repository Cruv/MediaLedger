from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.server import Server
from app.models.sharing import SharingScore
from app.models.user import MediaServerUser
from app.schemas.sharing import (
    SharingOverviewResponse,
    SharingScoreDetailResponse,
    SharingScoreResponse,
)

router = APIRouter()


def _severity(score: float) -> str:
    if score >= 71:
        return "critical"
    if score >= 46:
        return "high"
    if score >= 21:
        return "moderate"
    return "low"


def _build_score_response(
    score: SharingScore, username: str, server_name: str
) -> SharingScoreResponse:
    return SharingScoreResponse(
        user_id=str(score.user_id),
        username=username,
        server_name=server_name,
        overall_score=score.overall_score,
        ip_diversity_score=score.ip_diversity_score,
        concurrency_score=score.concurrency_score,
        pattern_score=score.pattern_score,
        device_score=score.device_score,
        cross_server_score=score.cross_server_score,
        severity=_severity(score.overall_score),
        analysis_window_start=score.analysis_window_start,
        analysis_window_end=score.analysis_window_end,
        computed_at=score.computed_at,
    )


@router.get("/", response_model=SharingOverviewResponse)
async def get_sharing_overview(db: AsyncSession = Depends(get_db)):
    """Get sharing scores for all analyzed users, sorted by overall score descending."""
    result = await db.execute(
        select(SharingScore, MediaServerUser.username, Server.name.label("server_name"))
        .join(MediaServerUser, SharingScore.user_id == MediaServerUser.id)
        .join(Server, MediaServerUser.server_id == Server.id)
        .order_by(SharingScore.overall_score.desc())
    )
    rows = result.all()

    scores = [_build_score_response(r[0], r[1], r[2]) for r in rows]

    critical = sum(1 for s in scores if s.severity == "critical")
    high = sum(1 for s in scores if s.severity == "high")
    moderate = sum(1 for s in scores if s.severity == "moderate")
    low = sum(1 for s in scores if s.severity == "low")

    return SharingOverviewResponse(
        total_users_analyzed=len(scores),
        critical_count=critical,
        high_count=high,
        moderate_count=moderate,
        low_count=low,
        scores=scores,
    )


@router.get("/{user_id}", response_model=SharingScoreDetailResponse)
async def get_sharing_detail(user_id: str, db: AsyncSession = Depends(get_db)):
    """Get detailed sharing analysis for a specific user."""
    result = await db.execute(
        select(SharingScore, MediaServerUser.username, Server.name.label("server_name"))
        .join(MediaServerUser, SharingScore.user_id == MediaServerUser.id)
        .join(Server, MediaServerUser.server_id == Server.id)
        .where(SharingScore.user_id == user_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="No sharing analysis found for this user")

    score, username, server_name = row
    return SharingScoreDetailResponse(
        user_id=str(score.user_id),
        username=username,
        server_name=server_name,
        overall_score=score.overall_score,
        ip_diversity_score=score.ip_diversity_score,
        concurrency_score=score.concurrency_score,
        pattern_score=score.pattern_score,
        device_score=score.device_score,
        cross_server_score=score.cross_server_score,
        severity=_severity(score.overall_score),
        analysis_window_start=score.analysis_window_start,
        analysis_window_end=score.analysis_window_end,
        computed_at=score.computed_at,
        evidence=score.evidence_json,
    )


@router.post("/analyze", status_code=202)
async def trigger_analysis(db: AsyncSession = Depends(get_db)):
    """Manually trigger sharing analysis for all users."""
    from app.sharing_engine.analyzer import SharingAnalyzer
    analyzer = SharingAnalyzer()

    result = await db.execute(
        select(MediaServerUser.id).where(MediaServerUser.is_disabled == False)
    )
    user_ids = [str(r[0]) for r in result.all()]

    analyzed = 0
    for uid in user_ids:
        try:
            await analyzer.analyze_user(db, uid)
            analyzed += 1
        except Exception:
            pass

    await db.commit()
    return {"message": f"Analysis complete for {analyzed}/{len(user_ids)} users"}
