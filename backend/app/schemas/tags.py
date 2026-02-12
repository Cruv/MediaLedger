import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class UserTagCreate(BaseModel):
    name: str
    color: str = "#6366f1"
    description: Optional[str] = None


class UserTagUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None


class UserTagResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    color: str
    description: Optional[str] = None
    user_count: int = 0
    created_at: datetime


class AssignTagRequest(BaseModel):
    user_ids: list[uuid.UUID]
