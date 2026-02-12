import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class InviteTemplate(Base):
    """Reusable template for user provisioning — library access, stream limits, etc."""
    __tablename__ = "invite_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    server_ids: Mapped[list] = mapped_column(ARRAY(String), server_default="{}", nullable=False)
    library_ids: Mapped[list | None] = mapped_column(ARRAY(String), nullable=True)
    policy_overrides: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    auto_tags: Mapped[list | None] = mapped_column(ARRAY(String), nullable=True)
    expiry_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class InviteCode(Base):
    """Single-use or multi-use invite code linked to a template."""
    __tablename__ = "invite_codes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("invite_templates.id", ondelete="CASCADE"))
    max_uses: Mapped[int] = mapped_column(Integer, default=1)
    times_used: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    template = relationship("InviteTemplate")


class InviteRedemption(Base):
    """Log of each invite code redemption."""
    __tablename__ = "invite_redemptions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invite_code_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("invite_codes.id", ondelete="CASCADE"))
    username: Mapped[str] = mapped_column(String(255))
    server_ids_provisioned: Mapped[list | None] = mapped_column(ARRAY(String), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="success")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    redeemed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    invite_code = relationship("InviteCode")
