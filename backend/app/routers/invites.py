"""Invite management: templates, invite codes, redemption with auto-provisioning."""

import logging
import secrets
import time
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.media_servers.factory import get_client
from app.models.invite import InviteCode, InviteRedemption, InviteTemplate
from app.models.server import Server
from app.models.user import MediaServerUser
from app.models.tags import UserTag, UserTagAssignment

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Simple in-memory rate limiter for redeem endpoint ────────
_redeem_attempts: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT_WINDOW = 300  # 5 minutes
RATE_LIMIT_MAX = 10  # max 10 attempts per IP per window


def _check_rate_limit(ip: str):
    now = time.monotonic()
    # Prune old entries
    _redeem_attempts[ip] = [t for t in _redeem_attempts[ip] if now - t < RATE_LIMIT_WINDOW]
    if len(_redeem_attempts[ip]) >= RATE_LIMIT_MAX:
        raise HTTPException(429, "Too many redemption attempts. Please try again later.")
    _redeem_attempts[ip].append(now)


# ── Schemas ──────────────────────────────────────────────────

class TemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    server_ids: list[str] = []
    library_ids: list[str] | None = None
    policy_overrides: dict | None = None
    auto_tags: list[str] | None = None
    expiry_days: int | None = None

class TemplateUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    server_ids: list[str] | None = None
    library_ids: list[str] | None = None
    policy_overrides: dict | None = None
    auto_tags: list[str] | None = None
    expiry_days: int | None = None

class CodeCreate(BaseModel):
    template_id: str
    max_uses: int = Field(default=1, ge=1, le=1000)
    expires_in_hours: int | None = None

class RedeemRequest(BaseModel):
    code: str
    username: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=255)


# ── Template CRUD ────────────────────────────────────────────

@router.get("/templates")
async def list_templates(db: AsyncSession = Depends(get_db)):
    """List all invite templates."""
    result = await db.execute(
        select(InviteTemplate).order_by(InviteTemplate.created_at.desc())
    )
    templates = result.scalars().all()
    return [_template_dict(t) for t in templates]


@router.post("/templates")
async def create_template(body: TemplateCreate, db: AsyncSession = Depends(get_db)):
    """Create a new invite template."""
    tmpl = InviteTemplate(
        name=body.name,
        description=body.description,
        server_ids=body.server_ids,
        library_ids=body.library_ids,
        policy_overrides=body.policy_overrides,
        auto_tags=body.auto_tags,
        expiry_days=body.expiry_days,
    )
    db.add(tmpl)
    await db.commit()
    await db.refresh(tmpl)
    return _template_dict(tmpl)


@router.put("/templates/{template_id}")
async def update_template(
    template_id: uuid.UUID,
    body: TemplateUpdate,
    db: AsyncSession = Depends(get_db),
):
    tmpl = await db.get(InviteTemplate, template_id)
    if not tmpl:
        raise HTTPException(404, "Template not found")
    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(tmpl, field, val)
    await db.commit()
    await db.refresh(tmpl)
    return _template_dict(tmpl)


@router.delete("/templates/{template_id}")
async def delete_template(template_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    tmpl = await db.get(InviteTemplate, template_id)
    if not tmpl:
        raise HTTPException(404, "Template not found")
    await db.delete(tmpl)
    await db.commit()
    return {"ok": True}


# ── Invite Codes ─────────────────────────────────────────────

@router.get("/codes")
async def list_codes(
    template_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List invite codes, optionally filtered by template."""
    query = select(InviteCode).order_by(InviteCode.created_at.desc())
    if template_id:
        query = query.where(InviteCode.template_id == template_id)
    result = await db.execute(query)
    codes = result.scalars().all()
    return [_code_dict(c) for c in codes]


@router.post("/codes")
async def generate_code(body: CodeCreate, db: AsyncSession = Depends(get_db)):
    """Generate a new invite code linked to a template."""
    tmpl = await db.get(InviteTemplate, uuid.UUID(body.template_id))
    if not tmpl:
        raise HTTPException(404, "Template not found")

    expires_at = None
    if body.expires_in_hours:
        expires_at = datetime.now(timezone.utc) + timedelta(hours=body.expires_in_hours)

    code_str = secrets.token_urlsafe(12)
    code = InviteCode(
        code=code_str,
        template_id=tmpl.id,
        max_uses=body.max_uses,
        expires_at=expires_at,
    )
    db.add(code)
    await db.commit()
    await db.refresh(code)
    return _code_dict(code)


@router.delete("/codes/{code_id}")
async def revoke_code(code_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    code = await db.get(InviteCode, code_id)
    if not code:
        raise HTTPException(404, "Invite code not found")
    code.is_active = False
    await db.commit()
    return {"ok": True}


# ── Redemption ───────────────────────────────────────────────

@router.post("/redeem")
async def redeem_invite(body: RedeemRequest, request: Request, db: AsyncSession = Depends(get_db)):
    _check_rate_limit(request.client.host if request.client else "unknown")
    """
    Redeem an invite code:
    1. Validate the code
    2. Create the user on every server in the template
    3. Apply policy overrides and library access
    4. Optionally set expiry date
    5. Apply auto-tags
    """
    # Look up code
    result = await db.execute(
        select(InviteCode).where(InviteCode.code == body.code)
    )
    invite = result.scalars().first()
    if not invite:
        raise HTTPException(404, "Invalid invite code")
    if not invite.is_active:
        raise HTTPException(410, "Invite code has been revoked")
    if invite.times_used >= invite.max_uses:
        raise HTTPException(410, "Invite code has reached its usage limit")
    if invite.expires_at and invite.expires_at < datetime.now(timezone.utc):
        raise HTTPException(410, "Invite code has expired")

    # Load template
    template = await db.get(InviteTemplate, invite.template_id)
    if not template:
        raise HTTPException(500, "Template missing for this invite code")

    # Provision on each server
    provisioned_servers: list[str] = []
    errors: list[str] = []
    for sid in template.server_ids:
        try:
            server = await db.get(Server, uuid.UUID(sid))
            if not server or not server.is_active:
                errors.append(f"Server {sid} not found or inactive")
                continue

            client = await get_client(
                str(server.id), server.server_type, server.base_url, server.api_key
            )

            # Create user
            new_user_resp = await client.create_user(body.username, body.password)
            remote_user_id = new_user_resp.get("Id") or new_user_resp.get("id", "")

            # Apply policy overrides
            if template.policy_overrides and remote_user_id:
                current_policy = await client.get_user_policy(remote_user_id)
                merged = {**current_policy, **template.policy_overrides}
                # If library access is restricted, set it
                if template.library_ids:
                    merged["EnableAllFolders"] = False
                    merged["EnabledFolders"] = template.library_ids
                await client.set_user_policy(remote_user_id, merged)
            elif template.library_ids and remote_user_id:
                current_policy = await client.get_user_policy(remote_user_id)
                current_policy["EnableAllFolders"] = False
                current_policy["EnabledFolders"] = template.library_ids
                await client.set_user_policy(remote_user_id, current_policy)

            # Track in our DB
            expiry = None
            if template.expiry_days:
                expiry = datetime.now(timezone.utc) + timedelta(days=template.expiry_days)

            db_user = MediaServerUser(
                server_id=server.id,
                remote_user_id=remote_user_id,
                username=body.username,
                is_admin=False,
                is_disabled=False,
                expires_at=expiry,
                invite_code_id=invite.id,
            )
            db.add(db_user)
            provisioned_servers.append(sid)

            # Auto-tag
            if template.auto_tags:
                await db.flush()  # ensure db_user.id is set
                for tag_name in template.auto_tags:
                    tag_result = await db.execute(
                        select(UserTag).where(UserTag.name == tag_name)
                    )
                    tag = tag_result.scalars().first()
                    if tag:
                        assignment = UserTagAssignment(
                            user_id=db_user.id, tag_id=tag.id
                        )
                        db.add(assignment)

        except Exception as e:
            logger.exception("Failed to provision user on server %s", sid)
            errors.append(f"Server {sid}: {str(e)}")

    # Increment usage
    invite.times_used += 1
    if invite.times_used >= invite.max_uses:
        invite.is_active = False

    # Log redemption
    redemption = InviteRedemption(
        invite_code_id=invite.id,
        username=body.username,
        server_ids_provisioned=provisioned_servers,
        status="success" if not errors else "partial",
        error_message="; ".join(errors) if errors else None,
    )
    db.add(redemption)
    await db.commit()

    return {
        "username": body.username,
        "servers_provisioned": provisioned_servers,
        "errors": errors,
        "expiry_days": template.expiry_days,
    }


# ── Redemption History ───────────────────────────────────────

@router.get("/redemptions")
async def list_redemptions(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(InviteRedemption)
        .order_by(InviteRedemption.redeemed_at.desc())
        .offset(offset)
        .limit(limit)
    )
    items = result.scalars().all()
    count = (await db.execute(select(func.count(InviteRedemption.id)))).scalar() or 0
    return {
        "items": [
            {
                "id": str(r.id),
                "invite_code_id": str(r.invite_code_id),
                "username": r.username,
                "servers_provisioned": r.server_ids_provisioned or [],
                "status": r.status,
                "error_message": r.error_message,
                "redeemed_at": r.redeemed_at.isoformat(),
            }
            for r in items
        ],
        "total": count,
    }


# ── Helpers ──────────────────────────────────────────────────

def _template_dict(t: InviteTemplate) -> dict:
    return {
        "id": str(t.id),
        "name": t.name,
        "description": t.description,
        "server_ids": t.server_ids or [],
        "library_ids": t.library_ids,
        "policy_overrides": t.policy_overrides,
        "auto_tags": t.auto_tags,
        "expiry_days": t.expiry_days,
        "created_at": t.created_at.isoformat(),
        "updated_at": t.updated_at.isoformat(),
    }


def _code_dict(c: InviteCode) -> dict:
    return {
        "id": str(c.id),
        "code": c.code,
        "template_id": str(c.template_id),
        "max_uses": c.max_uses,
        "times_used": c.times_used,
        "is_active": c.is_active,
        "expires_at": c.expires_at.isoformat() if c.expires_at else None,
        "created_at": c.created_at.isoformat(),
    }
