import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Server(Base):
    __tablename__ = "servers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255))
    server_type: Mapped[str] = mapped_column(String(20))  # 'emby' or 'jellyfin'
    base_url: Mapped[str] = mapped_column(String(1024), unique=True)
    api_key: Mapped[str] = mapped_column(String(512))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    poll_interval_sec: Mapped[int] = mapped_column(Integer, default=10)
    webhook_secret: Mapped[str | None] = mapped_column(String(255), nullable=True)
    server_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    server_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_polled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    users = relationship("MediaServerUser", back_populates="server", cascade="all, delete-orphan")
    libraries = relationship("Library", back_populates="server", cascade="all, delete-orphan")
