import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class MediaServerUser(Base):
    __tablename__ = "media_server_users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    server_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("servers.id", ondelete="CASCADE"))
    remote_user_id: Mapped[str] = mapped_column(String(255))
    username: Mapped[str] = mapped_column(String(255))
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    is_disabled: Mapped[bool] = mapped_column(Boolean, default=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_activity_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    profile_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Expiry / invite fields (migration 006)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expiry_notified: Mapped[bool] = mapped_column(Boolean, server_default="false", default=False)
    auto_disabled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    invite_code_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    # Stripe fields (migration 007)
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    subscription_status: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Relationships
    server = relationship("Server", back_populates="users")
    tags = relationship("UserTag", secondary="user_tag_assignments", back_populates="users", lazy="selectin")

    __table_args__ = (
        {"comment": "Users as reported by media servers. One row per user per server."},
    )


class UserCorrelation(Base):
    __tablename__ = "user_correlations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_a_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("media_server_users.id", ondelete="CASCADE"))
    user_b_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("media_server_users.id", ondelete="CASCADE"))
    correlation_type: Mapped[str] = mapped_column(String(50))  # 'manual', 'username_match', 'ip_match', 'algorithm'
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    evidence_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    confirmed_by_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user_a = relationship("MediaServerUser", foreign_keys=[user_a_id])
    user_b = relationship("MediaServerUser", foreign_keys=[user_b_id])
