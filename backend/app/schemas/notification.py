from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class NotificationAgentCreate(BaseModel):
    agent_type: str  # discord, webhook, gotify, ntfy, email
    name: str
    config_json: dict[str, Any]
    triggers: list[str] = []
    is_enabled: bool = True


class NotificationAgentUpdate(BaseModel):
    name: Optional[str] = None
    config_json: Optional[dict[str, Any]] = None
    triggers: Optional[list[str]] = None
    is_enabled: Optional[bool] = None


class NotificationAgentResponse(BaseModel):
    id: str
    agent_type: str
    name: str
    is_enabled: bool
    config_json: dict[str, Any]
    triggers: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationLogResponse(BaseModel):
    id: str
    agent_id: Optional[str] = None
    trigger_type: str
    subject: Optional[str] = None
    success: bool
    error_message: Optional[str] = None
    sent_at: datetime

    model_config = {"from_attributes": True}


class NotificationTestResult(BaseModel):
    success: bool
    message: str
