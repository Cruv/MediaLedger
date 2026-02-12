"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-02-11
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # servers
    op.create_table(
        "servers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("server_type", sa.String(20), nullable=False),
        sa.Column("base_url", sa.String(1024), nullable=False, unique=True),
        sa.Column("api_key", sa.String(512), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("poll_interval_sec", sa.Integer(), nullable=False, server_default=sa.text("10")),
        sa.Column("webhook_secret", sa.String(255), nullable=True),
        sa.Column("server_id", sa.String(255), nullable=True),
        sa.Column("server_version", sa.String(50), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_polled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # media_server_users
    op.create_table(
        "media_server_users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("server_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("servers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("remote_user_id", sa.String(255), nullable=False),
        sa.Column("username", sa.String(255), nullable=False),
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_disabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("avatar_url", sa.String(1024), nullable=True),
        sa.Column("profile_json", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_msu_server_remote", "media_server_users", ["server_id", "remote_user_id"], unique=True)
    op.create_index("idx_msu_username", "media_server_users", ["username"])

    # libraries
    op.create_table(
        "libraries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("server_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("servers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("remote_library_id", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("library_type", sa.String(50), nullable=False),
        sa.Column("item_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_lib_server_remote", "libraries", ["server_id", "remote_library_id"], unique=True)

    # library_items
    op.create_table(
        "library_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("library_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("libraries.id", ondelete="CASCADE"), nullable=False),
        sa.Column("server_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("servers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("remote_item_id", sa.String(255), nullable=False),
        sa.Column("title", sa.String(1024), nullable=False),
        sa.Column("sort_title", sa.String(1024), nullable=True),
        sa.Column("item_type", sa.String(50), nullable=False),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("parent_remote_id", sa.String(255), nullable=True),
        sa.Column("grandparent_remote_id", sa.String(255), nullable=True),
        sa.Column("season_number", sa.Integer(), nullable=True),
        sa.Column("episode_number", sa.Integer(), nullable=True),
        sa.Column("runtime_ticks", sa.BigInteger(), nullable=True),
        sa.Column("added_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("premiere_date", sa.Date(), nullable=True),
        sa.Column("genres", postgresql.ARRAY(sa.String(255)), nullable=True),
        sa.Column("imdb_id", sa.String(20), nullable=True),
        sa.Column("tmdb_id", sa.Integer(), nullable=True),
        sa.Column("tvdb_id", sa.Integer(), nullable=True),
        sa.Column("thumb_url", sa.String(1024), nullable=True),
        sa.Column("global_play_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("global_last_played_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata_json", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_li_server_remote", "library_items", ["server_id", "remote_item_id"], unique=True)
    op.create_index("idx_li_library", "library_items", ["library_id"])
    op.create_index("idx_li_imdb", "library_items", ["imdb_id"], postgresql_where=sa.text("imdb_id IS NOT NULL"))
    op.create_index("idx_li_tmdb", "library_items", ["tmdb_id"], postgresql_where=sa.text("tmdb_id IS NOT NULL"))
    op.create_index("idx_li_type", "library_items", ["item_type"])
    op.create_index("idx_li_added", "library_items", ["added_at"])

    # playback_sessions (ephemeral)
    op.create_table(
        "playback_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("server_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("servers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("media_server_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("library_items.id", ondelete="SET NULL"), nullable=True),
        sa.Column("remote_session_id", sa.String(255), nullable=False),
        sa.Column("state", sa.String(20), nullable=False, server_default=sa.text("'playing'")),
        sa.Column("play_method", sa.String(50), nullable=True),
        sa.Column("device_name", sa.String(255), nullable=True),
        sa.Column("device_id", sa.String(255), nullable=True),
        sa.Column("client_name", sa.String(255), nullable=True),
        sa.Column("ip_address", postgresql.INET(), nullable=True),
        sa.Column("position_ticks", sa.BigInteger(), nullable=False, server_default=sa.text("0")),
        sa.Column("runtime_ticks", sa.BigInteger(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_activity_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("paused_counter", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("buffer_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("transcode_info", postgresql.JSONB(), nullable=True),
        sa.Column("raw_session_json", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_ps_server", "playback_sessions", ["server_id"])
    op.create_index("idx_ps_user", "playback_sessions", ["user_id"])

    # session_history (permanent)
    op.create_table(
        "session_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("server_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("servers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("media_server_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("library_items.id", ondelete="SET NULL"), nullable=True),
        sa.Column("item_title", sa.String(1024), nullable=True),
        sa.Column("item_type", sa.String(50), nullable=True),
        sa.Column("item_year", sa.Integer(), nullable=True),
        sa.Column("parent_title", sa.String(1024), nullable=True),
        sa.Column("grandparent_title", sa.String(1024), nullable=True),
        sa.Column("season_number", sa.Integer(), nullable=True),
        sa.Column("episode_number", sa.Integer(), nullable=True),
        sa.Column("play_method", sa.String(50), nullable=True),
        sa.Column("device_name", sa.String(255), nullable=True),
        sa.Column("device_id", sa.String(255), nullable=True),
        sa.Column("client_name", sa.String(255), nullable=True),
        sa.Column("ip_address", postgresql.INET(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("stopped_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("play_duration_sec", sa.Integer(), nullable=False),
        sa.Column("paused_counter_sec", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("runtime_ticks", sa.BigInteger(), nullable=True),
        sa.Column("position_ticks", sa.BigInteger(), nullable=True),
        sa.Column("watched_pct", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("completed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("buffer_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("transcode_info", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_sh_server", "session_history", ["server_id"])
    op.create_index("idx_sh_user", "session_history", ["user_id"])
    op.create_index("idx_sh_item", "session_history", ["item_id"])
    op.create_index("idx_sh_started", "session_history", ["started_at"])
    op.create_index("idx_sh_user_item", "session_history", ["user_id", "item_id"])

    # media_requests
    op.create_table(
        "media_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("server_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("servers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("requested_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("media_server_users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(1024), nullable=False),
        sa.Column("item_type", sa.String(50), nullable=False),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("imdb_id", sa.String(20), nullable=True),
        sa.Column("tmdb_id", sa.Integer(), nullable=True),
        sa.Column("tvdb_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("source", sa.String(50), nullable=False, server_default=sa.text("'manual'")),
        sa.Column("external_request_id", sa.String(255), nullable=True),
        sa.Column("fulfilled_item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("library_items.id", ondelete="SET NULL"), nullable=True),
        sa.Column("fulfilled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("first_watched_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("first_watched_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("media_server_users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("requested_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("metadata_json", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_mr_status", "media_requests", ["status"])
    op.create_index("idx_mr_imdb", "media_requests", ["imdb_id"], postgresql_where=sa.text("imdb_id IS NOT NULL"))
    op.create_index("idx_mr_tmdb", "media_requests", ["tmdb_id"], postgresql_where=sa.text("tmdb_id IS NOT NULL"))

    # ip_logs
    op.create_table(
        "ip_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("media_server_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("server_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("servers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ip_address", postgresql.INET(), nullable=False),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("hit_count", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("geo_country", sa.String(3), nullable=True),
        sa.Column("geo_region", sa.String(100), nullable=True),
        sa.Column("geo_city", sa.String(255), nullable=True),
        sa.Column("geo_lat", sa.Float(), nullable=True),
        sa.Column("geo_lon", sa.Float(), nullable=True),
        sa.Column("is_vpn", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("asn", sa.Integer(), nullable=True),
        sa.Column("asn_org", sa.String(255), nullable=True),
    )
    op.create_index("idx_ip_user_ip", "ip_logs", ["user_id", "ip_address"], unique=True)
    op.create_index("idx_ip_address", "ip_logs", ["ip_address"])

    # device_fingerprints
    op.create_table(
        "device_fingerprints",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("media_server_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("server_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("servers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("device_id", sa.String(255), nullable=False),
        sa.Column("device_name", sa.String(255), nullable=True),
        sa.Column("client_name", sa.String(255), nullable=True),
        sa.Column("client_version", sa.String(100), nullable=True),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("session_count", sa.Integer(), nullable=False, server_default=sa.text("1")),
    )
    op.create_index("idx_df_user_device", "device_fingerprints", ["user_id", "device_id"], unique=True)
    op.create_index("idx_df_device_id", "device_fingerprints", ["device_id"])

    # concurrent_stream_events
    op.create_table(
        "concurrent_stream_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("media_server_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_a_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("session_history.id", ondelete="SET NULL"), nullable=True),
        sa.Column("session_b_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("session_history.id", ondelete="SET NULL"), nullable=True),
        sa.Column("overlap_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("overlap_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ip_a", postgresql.INET(), nullable=True),
        sa.Column("ip_b", postgresql.INET(), nullable=True),
        sa.Column("device_a", sa.String(255), nullable=True),
        sa.Column("device_b", sa.String(255), nullable=True),
        sa.Column("geo_distance_km", sa.Float(), nullable=True),
        sa.Column("same_network", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_cse_user", "concurrent_stream_events", ["user_id"])

    # sharing_scores
    op.create_table(
        "sharing_scores",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("media_server_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("overall_score", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("ip_diversity_score", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("concurrency_score", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("pattern_score", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("device_score", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("cross_server_score", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("analysis_window_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("analysis_window_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("evidence_json", postgresql.JSONB(), nullable=True),
        sa.Column("computed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_ss_user", "sharing_scores", ["user_id"])
    op.create_index("idx_ss_overall", "sharing_scores", ["overall_score"])

    # user_correlations
    op.create_table(
        "user_correlations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_a_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("media_server_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_b_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("media_server_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("correlation_type", sa.String(50), nullable=False),
        sa.Column("confidence_score", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("evidence_json", postgresql.JSONB(), nullable=True),
        sa.Column("confirmed_by_admin", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_uc_pair", "user_correlations", ["user_a_id", "user_b_id"], unique=True)

    # notification_agents
    op.create_table(
        "notification_agents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("agent_type", sa.String(50), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("config_json", postgresql.JSONB(), nullable=False),
        sa.Column("triggers", postgresql.ARRAY(sa.String(50)), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # notification_log
    op.create_table(
        "notification_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("agent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("notification_agents.id", ondelete="SET NULL"), nullable=True),
        sa.Column("trigger_type", sa.String(50), nullable=False),
        sa.Column("subject", sa.String(512), nullable=True),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("success", sa.Boolean(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # app_settings
    op.create_table(
        "app_settings",
        sa.Column("key", sa.String(255), primary_key=True),
        sa.Column("value", sa.Text(), nullable=True),
        sa.Column("value_type", sa.String(20), nullable=False, server_default=sa.text("'string'")),
        sa.Column("description", sa.String(512), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Seed default settings
    op.execute(
        """
        INSERT INTO app_settings (key, value, value_type, description) VALUES
        ('watched_threshold_pct', '85', 'float', 'Percentage of runtime to consider an item watched'),
        ('session_ignore_interval_sec', '120', 'integer', 'Ignore sessions shorter than this many seconds'),
        ('library_sync_interval_min', '60', 'integer', 'Minutes between library sync runs'),
        ('user_sync_interval_min', '30', 'integer', 'Minutes between user sync runs'),
        ('sharing_analysis_interval_min', '360', 'integer', 'Minutes between sharing analysis runs')
        """
    )


def downgrade() -> None:
    op.drop_table("app_settings")
    op.drop_table("notification_log")
    op.drop_table("notification_agents")
    op.drop_table("user_correlations")
    op.drop_table("sharing_scores")
    op.drop_table("concurrent_stream_events")
    op.drop_table("device_fingerprints")
    op.drop_table("ip_logs")
    op.drop_table("media_requests")
    op.drop_table("session_history")
    op.drop_table("playback_sessions")
    op.drop_table("library_items")
    op.drop_table("libraries")
    op.drop_table("media_server_users")
    op.drop_table("servers")
