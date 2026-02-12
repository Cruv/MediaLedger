from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.server import Server
from app.models.sharing import ConcurrentStreamEvent, IPLog, SharingScore
from app.models.user import MediaServerUser, UserCorrelation
from app.schemas.sharing import (
    ConcurrentEventResponse,
    CorrelationResponse,
    IPOverlapResponse,
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


@router.get("/correlations", response_model=list[CorrelationResponse])
async def get_correlations(db: AsyncSession = Depends(get_db)):
    """Get all user correlations with usernames and server names."""
    ua = select(
        MediaServerUser.id, MediaServerUser.username, Server.name.label("server_name")
    ).join(Server, MediaServerUser.server_id == Server.id).subquery()

    ub = select(
        MediaServerUser.id, MediaServerUser.username, Server.name.label("server_name")
    ).join(Server, MediaServerUser.server_id == Server.id).subquery()

    result = await db.execute(
        select(
            UserCorrelation,
            ua.c.username.label("user_a_username"),
            ua.c.server_name.label("user_a_server"),
            ub.c.username.label("user_b_username"),
            ub.c.server_name.label("user_b_server"),
        )
        .join(ua, UserCorrelation.user_a_id == ua.c.id)
        .join(ub, UserCorrelation.user_b_id == ub.c.id)
        .order_by(UserCorrelation.confidence_score.desc())
    )
    rows = result.all()
    return [
        CorrelationResponse(
            id=str(r[0].id),
            user_a_username=r[1],
            user_a_server=r[2],
            user_b_username=r[3],
            user_b_server=r[4],
            correlation_type=r[0].correlation_type,
            confidence_score=r[0].confidence_score,
            confirmed_by_admin=r[0].confirmed_by_admin,
        )
        for r in rows
    ]


@router.post("/correlations/{correlation_id}/confirm")
async def confirm_correlation(correlation_id: str, db: AsyncSession = Depends(get_db)):
    """Confirm a user correlation as valid."""
    result = await db.execute(
        select(UserCorrelation).where(UserCorrelation.id == correlation_id)
    )
    corr = result.scalar_one_or_none()
    if not corr:
        raise HTTPException(status_code=404, detail="Correlation not found")
    corr.confirmed_by_admin = True
    await db.commit()
    return {"status": "confirmed"}


@router.post("/correlations/{correlation_id}/dismiss")
async def dismiss_correlation(correlation_id: str, db: AsyncSession = Depends(get_db)):
    """Dismiss/delete a user correlation."""
    result = await db.execute(
        select(UserCorrelation).where(UserCorrelation.id == correlation_id)
    )
    corr = result.scalar_one_or_none()
    if not corr:
        raise HTTPException(status_code=404, detail="Correlation not found")
    await db.delete(corr)
    await db.commit()
    return {"status": "dismissed"}


@router.get("/ip-overlaps", response_model=list[IPOverlapResponse])
async def get_ip_overlaps(db: AsyncSession = Depends(get_db)):
    """Find users sharing IP addresses."""
    a = select(
        IPLog.user_id.label("user_a_id"),
        IPLog.ip_address,
        IPLog.geo_country,
    ).subquery()
    b = select(
        IPLog.user_id.label("user_b_id"),
        IPLog.ip_address,
        IPLog.geo_country,
    ).subquery()

    result = await db.execute(
        select(
            a.c.user_a_id,
            b.c.user_b_id,
            func.count(func.distinct(a.c.ip_address)).label("shared_ips"),
            func.array_agg(func.distinct(a.c.geo_country)).label("shared_countries"),
        )
        .join(b, (a.c.ip_address == b.c.ip_address) & (a.c.user_a_id < b.c.user_b_id))
        .group_by(a.c.user_a_id, b.c.user_b_id)
        .order_by(func.count(func.distinct(a.c.ip_address)).desc())
    )
    rows = result.all()

    all_ids = set()
    for r in rows:
        all_ids.add(r[0])
        all_ids.add(r[1])

    unames: dict = {}
    if all_ids:
        uname_result = await db.execute(
            select(MediaServerUser.id, MediaServerUser.username).where(
                MediaServerUser.id.in_(all_ids)
            )
        )
        unames = {r[0]: r[1] for r in uname_result.all()}

    return [
        IPOverlapResponse(
            user_a_username=unames.get(r[0], "Unknown"),
            user_b_username=unames.get(r[1], "Unknown"),
            shared_ips=r[2],
            shared_countries=[c for c in (r[3] or []) if c is not None],
        )
        for r in rows
    ]


@router.get("/concurrent-events", response_model=list[ConcurrentEventResponse])
async def get_concurrent_events(
    user_id: str | None = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """Get concurrent stream events, optionally filtered by user."""
    query = (
        select(ConcurrentStreamEvent, MediaServerUser.username)
        .join(MediaServerUser, ConcurrentStreamEvent.user_id == MediaServerUser.id)
        .order_by(ConcurrentStreamEvent.overlap_start.desc())
        .limit(limit)
    )
    if user_id:
        query = query.where(ConcurrentStreamEvent.user_id == user_id)

    result = await db.execute(query)
    rows = result.all()
    return [
        ConcurrentEventResponse(
            id=str(r[0].id),
            username=r[1],
            overlap_start=r[0].overlap_start,
            overlap_end=r[0].overlap_end,
            ip_a=str(r[0].ip_a) if r[0].ip_a else None,
            ip_b=str(r[0].ip_b) if r[0].ip_b else None,
            device_a=r[0].device_a,
            device_b=r[0].device_b,
            geo_distance_km=r[0].geo_distance_km,
            same_network=r[0].same_network,
        )
        for r in rows
    ]


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


# Keep /{user_id} last to avoid catching specific paths like /correlations
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
