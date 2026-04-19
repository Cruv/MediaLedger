"""Add indexes on last_activity_at for reaper and user sort

Revision ID: 009
Revises: 008
"""

from alembic import op

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade():
    # reap_stale_sessions scans by last_activity_at < cutoff every 60s
    op.create_index(
        "ix_playback_sessions_last_activity",
        "playback_sessions",
        ["last_activity_at"],
    )
    # Users list endpoint supports sort_by=last_activity_at
    op.create_index(
        "ix_msu_last_activity",
        "media_server_users",
        ["last_activity_at"],
    )


def downgrade():
    op.drop_index("ix_msu_last_activity", table_name="media_server_users")
    op.drop_index("ix_playback_sessions_last_activity", table_name="playback_sessions")
