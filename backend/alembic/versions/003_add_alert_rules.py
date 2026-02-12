"""Add alert rules

Revision ID: 003
Revises: 002
Create Date: 2026-02-11
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "alert_rules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("condition_type", sa.String(50), nullable=False),
        sa.Column("condition_config", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("notify_agent_ids", postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=True),
        sa.Column("cooldown_minutes", sa.Integer(), nullable=False, server_default=sa.text("60")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "alert_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("rule_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("alert_rules.id", ondelete="CASCADE"), nullable=False),
        sa.Column("triggered_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("context_json", postgresql.JSONB(), nullable=True),
        sa.Column("resolved", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )


def downgrade() -> None:
    op.drop_table("alert_events")
    op.drop_table("alert_rules")
