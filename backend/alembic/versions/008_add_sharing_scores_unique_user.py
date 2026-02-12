"""Add unique constraint on sharing_scores.user_id for upsert support

Revision ID: 008
Revises: 007
"""

from alembic import op

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade():
    # Remove duplicate rows before adding unique constraint: keep only the latest per user
    op.execute("""
        DELETE FROM sharing_scores a
        USING sharing_scores b
        WHERE a.user_id = b.user_id
          AND a.computed_at < b.computed_at
    """)
    op.drop_index("idx_ss_user", table_name="sharing_scores")
    op.create_index("idx_ss_user", "sharing_scores", ["user_id"], unique=True)


def downgrade():
    op.drop_index("idx_ss_user", table_name="sharing_scores")
    op.create_index("idx_ss_user", "sharing_scores", ["user_id"], unique=False)
