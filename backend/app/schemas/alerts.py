import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AlertRuleCreate(BaseModel):
    name: str
    condition_type: str
    condition_config: dict = {}
    is_enabled: bool = True
    notify_agent_ids: Optional[list[uuid.UUID]] = None
    cooldown_minutes: int = 60


class AlertRuleUpdate(BaseModel):
    name: Optional[str] = None
    condition_type: Optional[str] = None
    condition_config: Optional[dict] = None
    is_enabled: Optional[bool] = None
    notify_agent_ids: Optional[list[uuid.UUID]] = None
    cooldown_minutes: Optional[int] = None


class AlertRuleResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    condition_type: str
    condition_config: dict
    is_enabled: bool
    notify_agent_ids: Optional[list[uuid.UUID]] = None
    cooldown_minutes: int
    created_at: datetime
    updated_at: datetime
    recent_event_count: int = 0
    unresolved_count: int = 0


class AlertEventResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    rule_id: uuid.UUID
    rule_name: Optional[str] = None
    triggered_at: datetime
    context_json: Optional[dict] = None
    resolved: bool


class PaginatedAlertEvents(BaseModel):
    items: list[AlertEventResponse]
    total: int
    page: int
    page_size: int
