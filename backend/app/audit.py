"""Utility to log admin actions to the audit log."""

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AdminAuditLog


async def log_action(
    db: AsyncSession,
    action: str,
    target_type: str,
    target_id: str | None = None,
    target_label: str | None = None,
    details: dict[str, Any] | None = None,
) -> None:
    """Record an admin action in the audit log."""
    entry = AdminAuditLog(
        action=action,
        target_type=target_type,
        target_id=target_id,
        target_label=target_label,
        details=details,
    )
    db.add(entry)
    # Don't commit here — let the caller's transaction handle it
