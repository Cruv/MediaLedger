import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.alerts import AlertEvent, AlertRule
from app.schemas.alerts import (
    AlertEventResponse,
    AlertRuleCreate,
    AlertRuleResponse,
    AlertRuleUpdate,
    PaginatedAlertEvents,
)

router = APIRouter()


@router.get("/rules", response_model=list[AlertRuleResponse])
async def list_rules(db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    query = (
        select(
            AlertRule,
            func.count(AlertEvent.id).filter(AlertEvent.triggered_at >= week_ago).label("recent_event_count"),
            func.count(AlertEvent.id).filter(AlertEvent.resolved == False).label("unresolved_count"),
        )
        .outerjoin(AlertEvent, AlertRule.id == AlertEvent.rule_id)
        .group_by(AlertRule.id)
        .order_by(AlertRule.name)
    )
    result = await db.execute(query)
    return [
        AlertRuleResponse(
            id=row[0].id,
            name=row[0].name,
            condition_type=row[0].condition_type,
            condition_config=row[0].condition_config,
            is_enabled=row[0].is_enabled,
            notify_agent_ids=row[0].notify_agent_ids,
            cooldown_minutes=row[0].cooldown_minutes,
            created_at=row[0].created_at,
            updated_at=row[0].updated_at,
            recent_event_count=row[1],
            unresolved_count=row[2],
        )
        for row in result.all()
    ]


@router.post("/rules", response_model=AlertRuleResponse, status_code=201)
async def create_rule(body: AlertRuleCreate, db: AsyncSession = Depends(get_db)):
    rule = AlertRule(
        name=body.name,
        condition_type=body.condition_type,
        condition_config=body.condition_config,
        is_enabled=body.is_enabled,
        notify_agent_ids=body.notify_agent_ids,
        cooldown_minutes=body.cooldown_minutes,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return AlertRuleResponse(
        id=rule.id, name=rule.name, condition_type=rule.condition_type,
        condition_config=rule.condition_config, is_enabled=rule.is_enabled,
        notify_agent_ids=rule.notify_agent_ids, cooldown_minutes=rule.cooldown_minutes,
        created_at=rule.created_at, updated_at=rule.updated_at,
    )


@router.patch("/rules/{rule_id}", response_model=AlertRuleResponse)
async def update_rule(rule_id: uuid.UUID, body: AlertRuleUpdate, db: AsyncSession = Depends(get_db)):
    rule = await db.get(AlertRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(rule, field, value)

    await db.commit()
    await db.refresh(rule)

    # Get counts
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    counts = await db.execute(
        select(
            func.count(AlertEvent.id).filter(AlertEvent.triggered_at >= week_ago),
            func.count(AlertEvent.id).filter(AlertEvent.resolved == False),
        ).where(AlertEvent.rule_id == rule_id)
    )
    row = counts.one()

    return AlertRuleResponse(
        id=rule.id, name=rule.name, condition_type=rule.condition_type,
        condition_config=rule.condition_config, is_enabled=rule.is_enabled,
        notify_agent_ids=rule.notify_agent_ids, cooldown_minutes=rule.cooldown_minutes,
        created_at=rule.created_at, updated_at=rule.updated_at,
        recent_event_count=row[0], unresolved_count=row[1],
    )


@router.delete("/rules/{rule_id}", status_code=204)
async def delete_rule(rule_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    rule = await db.get(AlertRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    await db.delete(rule)
    await db.commit()


@router.get("/events", response_model=PaginatedAlertEvents)
async def list_events(
    resolved: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    base = (
        select(AlertEvent, AlertRule.name.label("rule_name"))
        .join(AlertRule, AlertEvent.rule_id == AlertRule.id)
    )
    count_q = select(func.count(AlertEvent.id))

    if resolved is not None:
        base = base.where(AlertEvent.resolved == resolved)
        count_q = count_q.where(AlertEvent.resolved == resolved)

    total = (await db.execute(count_q)).scalar() or 0
    offset = (page - 1) * page_size
    query = base.order_by(AlertEvent.triggered_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)

    items = []
    for row in result.all():
        event = row[0]
        resp = AlertEventResponse(
            id=event.id,
            rule_id=event.rule_id,
            rule_name=row[1],
            triggered_at=event.triggered_at,
            context_json=event.context_json,
            resolved=event.resolved,
        )
        items.append(resp)

    return PaginatedAlertEvents(items=items, total=total, page=page, page_size=page_size)


@router.post("/events/{event_id}/resolve", status_code=204)
async def resolve_event(event_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    event = await db.get(AlertEvent, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event.resolved = True
    await db.commit()


@router.get("/unresolved-count")
async def unresolved_count(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(func.count(AlertEvent.id)).where(AlertEvent.resolved == False)
    )
    return {"count": result.scalar() or 0}
