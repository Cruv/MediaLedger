import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255))
    condition_type: Mapped[str] = mapped_column(String(50))
    condition_config: Mapped[dict] = mapped_column(JSONB, default=dict)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_agent_ids: Mapped[list | None] = mapped_column(ARRAY(UUID(as_uuid=True)), nullable=True)
    cooldown_minutes: Mapped[int] = mapped_column(Integer, default=60)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    events = relationship("AlertEvent", back_populates="rule", cascade="all, delete-orphan")


class AlertEvent(Base):
    __tablename__ = "alert_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("alert_rules.id", ondelete="CASCADE"))
    triggered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    context_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)

    rule = relationship("AlertRule", back_populates="events")
