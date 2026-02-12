import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


# ─── User Notes ───

class UserNoteCreate(BaseModel):
    content: str
    pinned: bool = False


class UserNoteUpdate(BaseModel):
    content: Optional[str] = None
    pinned: Optional[bool] = None


class UserNoteResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    content: str
    pinned: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Admin Audit Log ───

class AuditLogEntry(BaseModel):
    id: uuid.UUID
    action: str
    target_type: str
    target_id: Optional[str] = None
    target_label: Optional[str] = None
    details: Optional[dict[str, Any]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedAuditLog(BaseModel):
    items: list[AuditLogEntry]
    total: int
    page: int
    page_size: int
