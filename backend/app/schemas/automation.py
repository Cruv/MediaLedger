import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class AutomationRuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    condition_type: str
    condition_config: dict[str, Any] = {}
    action_type: str
    action_config: dict[str, Any] = {}
    is_enabled: bool = True
    cooldown_minutes: int = 60


class AutomationRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    condition_config: Optional[dict[str, Any]] = None
    action_config: Optional[dict[str, Any]] = None
    is_enabled: Optional[bool] = None
    cooldown_minutes: Optional[int] = None


class AutomationRuleResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    condition_type: str
    condition_config: dict[str, Any]
    action_type: str
    action_config: dict[str, Any]
    is_enabled: bool
    cooldown_minutes: int
    created_at: datetime
    recent_executions: int = 0

    model_config = {"from_attributes": True}


class AutomationHistoryResponse(BaseModel):
    id: uuid.UUID
    rule_id: uuid.UUID
    action_taken: str
    target_user_id: Optional[str] = None
    target_username: Optional[str] = None
    context: Optional[dict[str, Any]] = None
    success: bool
    error_message: Optional[str] = None
    executed_at: datetime

    model_config = {"from_attributes": True}


class PaginatedAutomationHistory(BaseModel):
    items: list[AutomationHistoryResponse]
    total: int
    page: int
    page_size: int
