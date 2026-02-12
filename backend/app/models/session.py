import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PlaybackSession(Base):
    """Ephemeral active sessions. Rows exist only while playback is happening."""

    __tablename__ = "playback_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    server_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("servers.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("media_server_users.id", ondelete="CASCADE"))
    item_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("library_items.id", ondelete="SET NULL"), nullable=True)
    remote_session_id: Mapped[str] = mapped_column(String(255))
    state: Mapped[str] = mapped_column(String(20), default="playing")  # 'playing', 'paused', 'buffering'
    play_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    device_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    device_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    client_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(INET, nullable=True)
    position_ticks: Mapped[int] = mapped_column(BigInteger, default=0)
    runtime_ticks: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_activity_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    paused_counter: Mapped[int] = mapped_column(Integer, default=0)
    buffer_count: Mapped[int] = mapped_column(Integer, default=0)
    transcode_info: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    raw_session_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    server = relationship("Server")
    user = relationship("MediaServerUser")
    item = relationship("LibraryItem")


class SessionHistory(Base):
    """Permanent record created when a playback session ends."""

    __tablename__ = "session_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    server_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("servers.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("media_server_users.id", ondelete="CASCADE"))
    item_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("library_items.id", ondelete="SET NULL"), nullable=True)
    # Denormalized item metadata
    item_title: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    item_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    item_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    parent_title: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    grandparent_title: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    season_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    episode_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Session data
    play_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    device_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    device_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    client_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(INET, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    stopped_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    play_duration_sec: Mapped[int] = mapped_column(Integer)
    paused_counter_sec: Mapped[int] = mapped_column(Integer, default=0)
    runtime_ticks: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    position_ticks: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    watched_pct: Mapped[float] = mapped_column(Float, default=0.0)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    buffer_count: Mapped[int] = mapped_column(Integer, default=0)
    transcode_info: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    server = relationship("Server")
    user = relationship("MediaServerUser")
    item = relationship("LibraryItem")
