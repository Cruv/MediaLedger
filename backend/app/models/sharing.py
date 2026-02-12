import uuid
from datetime import datetime

from sqlalchemy import (
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


class IPLog(Base):
    __tablename__ = "ip_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("media_server_users.id", ondelete="CASCADE"))
    server_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("servers.id", ondelete="CASCADE"))
    ip_address: Mapped[str] = mapped_column(INET)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    hit_count: Mapped[int] = mapped_column(Integer, default=1)
    geo_country: Mapped[str | None] = mapped_column(String(3), nullable=True)
    geo_region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    geo_city: Mapped[str | None] = mapped_column(String(255), nullable=True)
    geo_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    geo_lon: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_vpn: Mapped[bool] = mapped_column(Boolean, default=False)
    asn: Mapped[int | None] = mapped_column(Integer, nullable=True)
    asn_org: Mapped[str | None] = mapped_column(String(255), nullable=True)

    user = relationship("MediaServerUser")


class DeviceFingerprint(Base):
    __tablename__ = "device_fingerprints"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("media_server_users.id", ondelete="CASCADE"))
    server_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("servers.id", ondelete="CASCADE"))
    device_id: Mapped[str] = mapped_column(String(255))
    device_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    client_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    client_version: Mapped[str | None] = mapped_column(String(100), nullable=True)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    session_count: Mapped[int] = mapped_column(Integer, default=1)

    user = relationship("MediaServerUser")


class ConcurrentStreamEvent(Base):
    __tablename__ = "concurrent_stream_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("media_server_users.id", ondelete="CASCADE"))
    session_a_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("session_history.id", ondelete="SET NULL"), nullable=True)
    session_b_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("session_history.id", ondelete="SET NULL"), nullable=True)
    overlap_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    overlap_end: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ip_a: Mapped[str | None] = mapped_column(INET, nullable=True)
    ip_b: Mapped[str | None] = mapped_column(INET, nullable=True)
    device_a: Mapped[str | None] = mapped_column(String(255), nullable=True)
    device_b: Mapped[str | None] = mapped_column(String(255), nullable=True)
    geo_distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    same_network: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("MediaServerUser")


class SharingScore(Base):
    __tablename__ = "sharing_scores"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("media_server_users.id", ondelete="CASCADE"))
    overall_score: Mapped[float] = mapped_column(Float, default=0.0)
    ip_diversity_score: Mapped[float] = mapped_column(Float, default=0.0)
    concurrency_score: Mapped[float] = mapped_column(Float, default=0.0)
    pattern_score: Mapped[float] = mapped_column(Float, default=0.0)
    device_score: Mapped[float] = mapped_column(Float, default=0.0)
    cross_server_score: Mapped[float] = mapped_column(Float, default=0.0)
    analysis_window_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    analysis_window_end: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    evidence_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("MediaServerUser")
