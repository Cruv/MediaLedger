import uuid
from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Library(Base):
    __tablename__ = "libraries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    server_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("servers.id", ondelete="CASCADE"))
    remote_library_id: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(255))
    library_type: Mapped[str] = mapped_column(String(50))  # 'movies', 'tvshows', 'music', etc.
    item_count: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    server = relationship("Server", back_populates="libraries")
    items = relationship("LibraryItem", back_populates="library", cascade="all, delete-orphan")


class LibraryItem(Base):
    __tablename__ = "library_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    library_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("libraries.id", ondelete="CASCADE"))
    server_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("servers.id", ondelete="CASCADE"))
    remote_item_id: Mapped[str] = mapped_column(String(255))
    title: Mapped[str] = mapped_column(String(1024))
    sort_title: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    item_type: Mapped[str] = mapped_column(String(50))  # 'Movie', 'Episode', 'Series', etc.
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    parent_remote_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    grandparent_remote_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    season_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    episode_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    runtime_ticks: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    added_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    premiere_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    genres: Mapped[list[str] | None] = mapped_column(ARRAY(String(255)), nullable=True)
    imdb_id: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    tmdb_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    tvdb_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    thumb_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    global_play_count: Mapped[int] = mapped_column(Integer, default=0)
    global_last_played_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    library = relationship("Library", back_populates="items")
