import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.notification import NotificationAgent, NotificationLog
from app.notifications.agents import create_agent
from app.schemas.notification import (
    NotificationAgentCreate,
    NotificationAgentResponse,
    NotificationAgentUpdate,
    NotificationLogResponse,
    NotificationTestResult,
)

router = APIRouter()

VALID_TRIGGERS = [
    "on_play", "on_stop", "on_concurrent", "on_new_device",
    "sharing_alert", "request_available", "request_watched",
    "newsletter", "admin_digest", "user_expiry", "payment_failed",
]


@router.get("/agents", response_model=list[NotificationAgentResponse])
async def list_agents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(NotificationAgent).order_by(NotificationAgent.name))
    agents = result.scalars().all()
    return [
        NotificationAgentResponse(
            id=str(a.id), agent_type=a.agent_type, name=a.name,
            is_enabled=a.is_enabled, config_json=a.config_json,
            triggers=a.triggers or [], created_at=a.created_at,
        )
        for a in agents
    ]


@router.post("/agents", response_model=NotificationAgentResponse, status_code=201)
async def create_agent_endpoint(body: NotificationAgentCreate, db: AsyncSession = Depends(get_db)):
    agent = NotificationAgent(
        agent_type=body.agent_type,
        name=body.name,
        config_json=body.config_json,
        triggers=body.triggers,
        is_enabled=body.is_enabled,
    )
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return NotificationAgentResponse(
        id=str(agent.id), agent_type=agent.agent_type, name=agent.name,
        is_enabled=agent.is_enabled, config_json=agent.config_json,
        triggers=agent.triggers or [], created_at=agent.created_at,
    )


@router.patch("/agents/{agent_id}", response_model=NotificationAgentResponse)
async def update_agent(agent_id: str, body: NotificationAgentUpdate, db: AsyncSession = Depends(get_db)):
    agent = await db.get(NotificationAgent, uuid.UUID(agent_id))
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    if body.name is not None:
        agent.name = body.name
    if body.config_json is not None:
        agent.config_json = body.config_json
    if body.triggers is not None:
        agent.triggers = body.triggers
    if body.is_enabled is not None:
        agent.is_enabled = body.is_enabled

    await db.commit()
    await db.refresh(agent)
    return NotificationAgentResponse(
        id=str(agent.id), agent_type=agent.agent_type, name=agent.name,
        is_enabled=agent.is_enabled, config_json=agent.config_json,
        triggers=agent.triggers or [], created_at=agent.created_at,
    )


@router.delete("/agents/{agent_id}", status_code=204)
async def delete_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    agent = await db.get(NotificationAgent, uuid.UUID(agent_id))
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    await db.delete(agent)
    await db.commit()


@router.post("/agents/{agent_id}/test", response_model=NotificationTestResult)
async def test_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    agent_row = await db.get(NotificationAgent, uuid.UUID(agent_id))
    if not agent_row:
        raise HTTPException(status_code=404, detail="Agent not found")

    try:
        agent = create_agent(agent_row.agent_type, agent_row.config_json)
        success = await agent.test()
        msg = "Test notification sent successfully" if success else "Test notification failed"
        return NotificationTestResult(success=success, message=msg)
    except Exception as e:
        return NotificationTestResult(success=False, message=str(e))


@router.get("/triggers")
async def list_triggers():
    """List all available trigger types."""
    return VALID_TRIGGERS


@router.get("/log", response_model=list[NotificationLogResponse])
async def get_log(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(NotificationLog).order_by(NotificationLog.sent_at.desc()).limit(limit)
    )
    logs = result.scalars().all()
    return [
        NotificationLogResponse(
            id=str(l.id),
            agent_id=str(l.agent_id) if l.agent_id else None,
            trigger_type=l.trigger_type,
            subject=l.subject,
            success=l.success,
            error_message=l.error_message,
            sent_at=l.sent_at,
        )
        for l in logs
    ]
