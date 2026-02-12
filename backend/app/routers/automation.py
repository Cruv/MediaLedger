import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import log_action
from app.db.session import get_db
from app.models.automation import AutomationHistory, AutomationRule
from app.schemas.automation import (
    AutomationHistoryResponse,
    AutomationRuleCreate,
    AutomationRuleResponse,
    AutomationRuleUpdate,
    PaginatedAutomationHistory,
)

router = APIRouter()

VALID_CONDITIONS = ["concurrent_streams", "sharing_score", "watch_hours", "inactive_streaming"]
VALID_ACTIONS = ["kill_sessions", "disable_user", "add_tag", "remove_tag", "notify"]


@router.get("/rules", response_model=list[AutomationRuleResponse])
async def list_rules(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AutomationRule).order_by(AutomationRule.created_at.desc()))
    rules = result.scalars().all()

    # Get recent execution counts (last 24h)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    responses = []
    for rule in rules:
        count_result = await db.execute(
            select(func.count(AutomationHistory.id)).where(
                AutomationHistory.rule_id == rule.id,
                AutomationHistory.executed_at >= cutoff,
            )
        )
        resp = AutomationRuleResponse.model_validate(rule)
        resp.recent_executions = count_result.scalar() or 0
        responses.append(resp)

    return responses


@router.post("/rules", response_model=AutomationRuleResponse, status_code=201)
async def create_rule(body: AutomationRuleCreate, db: AsyncSession = Depends(get_db)):
    if body.condition_type not in VALID_CONDITIONS:
        raise HTTPException(400, f"Invalid condition_type. Valid: {VALID_CONDITIONS}")
    if body.action_type not in VALID_ACTIONS:
        raise HTTPException(400, f"Invalid action_type. Valid: {VALID_ACTIONS}")

    rule = AutomationRule(
        name=body.name,
        description=body.description,
        condition_type=body.condition_type,
        condition_config=body.condition_config,
        action_type=body.action_type,
        action_config=body.action_config,
        is_enabled=body.is_enabled,
        cooldown_minutes=body.cooldown_minutes,
    )
    db.add(rule)
    await log_action(db, "rule.created", "automation_rule", target_label=body.name,
                     details={"condition": body.condition_type, "action": body.action_type})
    await db.commit()
    await db.refresh(rule)
    resp = AutomationRuleResponse.model_validate(rule)
    resp.recent_executions = 0
    return resp


@router.patch("/rules/{rule_id}", response_model=AutomationRuleResponse)
async def update_rule(rule_id: uuid.UUID, body: AutomationRuleUpdate, db: AsyncSession = Depends(get_db)):
    rule = await db.get(AutomationRule, rule_id)
    if not rule:
        raise HTTPException(404, "Rule not found")

    if body.name is not None:
        rule.name = body.name
    if body.description is not None:
        rule.description = body.description
    if body.condition_config is not None:
        rule.condition_config = body.condition_config
    if body.action_config is not None:
        rule.action_config = body.action_config
    if body.is_enabled is not None:
        rule.is_enabled = body.is_enabled
    if body.cooldown_minutes is not None:
        rule.cooldown_minutes = body.cooldown_minutes

    await db.commit()
    await db.refresh(rule)
    resp = AutomationRuleResponse.model_validate(rule)
    return resp


@router.delete("/rules/{rule_id}", status_code=204)
async def delete_rule(rule_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    rule = await db.get(AutomationRule, rule_id)
    if not rule:
        raise HTTPException(404, "Rule not found")
    await log_action(db, "rule.deleted", "automation_rule", str(rule_id), rule.name)
    await db.delete(rule)
    await db.commit()


@router.get("/history", response_model=PaginatedAutomationHistory)
async def get_history(
    rule_id: uuid.UUID | None = None,
    success: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    base = select(AutomationHistory)
    count_q = select(func.count(AutomationHistory.id))

    if rule_id:
        base = base.where(AutomationHistory.rule_id == rule_id)
        count_q = count_q.where(AutomationHistory.rule_id == rule_id)
    if success is not None:
        base = base.where(AutomationHistory.success == success)
        count_q = count_q.where(AutomationHistory.success == success)

    total = (await db.execute(count_q)).scalar() or 0
    offset = (page - 1) * page_size
    result = await db.execute(
        base.order_by(AutomationHistory.executed_at.desc()).offset(offset).limit(page_size)
    )
    entries = result.scalars().all()

    return PaginatedAutomationHistory(
        items=[
            AutomationHistoryResponse(
                id=e.id, rule_id=e.rule_id, action_taken=e.action_taken,
                target_user_id=str(e.target_user_id) if e.target_user_id else None,
                target_username=e.target_username, context=e.context,
                success=e.success, error_message=e.error_message, executed_at=e.executed_at,
            )
            for e in entries
        ],
        total=total, page=page, page_size=page_size,
    )


@router.get("/conditions")
async def list_conditions():
    return VALID_CONDITIONS


@router.get("/actions")
async def list_actions():
    return VALID_ACTIONS
