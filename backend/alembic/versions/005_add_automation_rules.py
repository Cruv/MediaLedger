"""Add automation_rules and automation_history tables

Revision ID: 005
Revises: 004
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "automation_rules",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("condition_type", sa.String(100), nullable=False),
        sa.Column("condition_config", JSONB(), nullable=False, server_default="{}"),
        sa.Column("action_type", sa.String(100), nullable=False),
        sa.Column("action_config", JSONB(), nullable=False, server_default="{}"),
        sa.Column("is_enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("cooldown_minutes", sa.Integer(), server_default=sa.text("60"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "automation_history",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("rule_id", UUID(as_uuid=True), sa.ForeignKey("automation_rules.id", ondelete="CASCADE"), nullable=False),
        sa.Column("action_taken", sa.String(100), nullable=False),
        sa.Column("target_user_id", UUID(as_uuid=True), nullable=True),
        sa.Column("target_username", sa.String(255), nullable=True),
        sa.Column("context", JSONB(), nullable=True),
        sa.Column("success", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("executed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_automation_history_rule_id", "automation_history", ["rule_id"])
    op.create_index("ix_automation_history_executed", "automation_history", ["executed_at"])


def downgrade() -> None:
    op.drop_table("automation_history")
    op.drop_table("automation_rules")
