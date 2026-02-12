import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class MediaRequest(Base):
    __tablename__ = "media_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    server_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("servers.id", ondelete="SET NULL"), nullable=True)
    requested_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("media_server_users.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(1024))
    item_type: Mapped[str] = mapped_column(String(50))  # 'Movie', 'Series'
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    imdb_id: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    tmdb_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    tvdb_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, approved, available, watched, partially_watched, declined
    source: Mapped[str] = mapped_column(String(50), default="manual")  # manual, overseerr, jellyseerr
    external_request_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    fulfilled_item_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("library_items.id", ondelete="SET NULL"), nullable=True)
    fulfilled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    first_watched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    first_watched_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("media_server_users.id", ondelete="SET NULL"), nullable=True)
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    metadata_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    requested_by = relationship("MediaServerUser", foreign_keys=[requested_by_user_id])
    first_watched_by = relationship("MediaServerUser", foreign_keys=[first_watched_by_id])
    fulfilled_item = relationship("LibraryItem")
