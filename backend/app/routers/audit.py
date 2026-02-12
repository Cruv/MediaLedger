import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import log_action
from app.db.session import get_db
from app.models.audit import AdminAuditLog, UserNote
from app.models.user import MediaServerUser
from app.schemas.audit import (
    AuditLogEntry,
    PaginatedAuditLog,
    UserNoteCreate,
    UserNoteResponse,
    UserNoteUpdate,
)

router = APIRouter()


# ─── User Notes ───


@router.get("/users/{user_id}/notes", response_model=list[UserNoteResponse])
async def list_user_notes(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get all notes for a user, pinned first then by date."""
    result = await db.execute(
        select(UserNote)
        .where(UserNote.user_id == user_id)
        .order_by(UserNote.pinned.desc(), UserNote.created_at.desc())
    )
    return result.scalars().all()


@router.post("/users/{user_id}/notes", response_model=UserNoteResponse, status_code=201)
async def create_user_note(
    user_id: uuid.UUID,
    body: UserNoteCreate,
    db: AsyncSession = Depends(get_db),
):
    # Verify user exists
    user = await db.get(MediaServerUser, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    note = UserNote(user_id=user_id, content=body.content, pinned=body.pinned)
    db.add(note)

    await log_action(
        db,
        action="note.created",
        target_type="user",
        target_id=str(user_id),
        target_label=user.username,
        details={"preview": body.content[:100]},
    )

    await db.commit()
    await db.refresh(note)
    return note


@router.patch("/notes/{note_id}", response_model=UserNoteResponse)
async def update_note(
    note_id: uuid.UUID,
    body: UserNoteUpdate,
    db: AsyncSession = Depends(get_db),
):
    note = await db.get(UserNote, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    if body.content is not None:
        note.content = body.content
    if body.pinned is not None:
        note.pinned = body.pinned

    await log_action(
        db,
        action="note.updated",
        target_type="user",
        target_id=str(note.user_id),
        details={"note_id": str(note_id)},
    )

    await db.commit()
    await db.refresh(note)
    return note


@router.delete("/notes/{note_id}", status_code=204)
async def delete_note(note_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    note = await db.get(UserNote, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    await log_action(
        db,
        action="note.deleted",
        target_type="user",
        target_id=str(note.user_id),
        details={"note_id": str(note_id)},
    )

    await db.delete(note)
    await db.commit()


# ─── Audit Log ───


@router.get("/audit-log", response_model=PaginatedAuditLog)
async def get_audit_log(
    target_type: str | None = None,
    target_id: str | None = None,
    action: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Get the admin audit log with optional filters."""
    base = select(AdminAuditLog)
    count_q = select(func.count(AdminAuditLog.id))

    if target_type:
        base = base.where(AdminAuditLog.target_type == target_type)
        count_q = count_q.where(AdminAuditLog.target_type == target_type)
    if target_id:
        base = base.where(AdminAuditLog.target_id == target_id)
        count_q = count_q.where(AdminAuditLog.target_id == target_id)
    if action:
        base = base.where(AdminAuditLog.action.ilike(f"%{action}%"))
        count_q = count_q.where(AdminAuditLog.action.ilike(f"%{action}%"))

    total = (await db.execute(count_q)).scalar() or 0

    offset = (page - 1) * page_size
    result = await db.execute(
        base.order_by(AdminAuditLog.created_at.desc()).offset(offset).limit(page_size)
    )
    entries = result.scalars().all()

    return PaginatedAuditLog(
        items=[AuditLogEntry.model_validate(e) for e in entries],
        total=total,
        page=page,
        page_size=page_size,
    )
