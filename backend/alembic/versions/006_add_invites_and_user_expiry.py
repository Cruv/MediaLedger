"""Add invite templates, invite codes, redemptions, and user expiry columns

Revision ID: 006
Revises: 005
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Invite templates ──
    op.create_table(
        "invite_templates",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("server_ids", ARRAY(sa.String()), server_default="{}", nullable=False),
        sa.Column("library_ids", ARRAY(sa.String()), nullable=True),
        sa.Column("policy_overrides", JSONB(), nullable=True),
        sa.Column("auto_tags", ARRAY(sa.String()), nullable=True),
        sa.Column("expiry_days", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── Invite codes ──
    op.create_table(
        "invite_codes",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("code", sa.String(64), unique=True, nullable=False),
        sa.Column("template_id", UUID(as_uuid=True), sa.ForeignKey("invite_templates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("max_uses", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column("times_used", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_invite_codes_code", "invite_codes", ["code"])

    # ── Invite redemptions ──
    op.create_table(
        "invite_redemptions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("invite_code_id", UUID(as_uuid=True), sa.ForeignKey("invite_codes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("username", sa.String(255), nullable=False),
        sa.Column("server_ids_provisioned", ARRAY(sa.String()), nullable=True),
        sa.Column("status", sa.String(50), server_default="'success'", nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("redeemed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_invite_redemptions_code_id", "invite_redemptions", ["invite_code_id"])

    # ── User expiry columns on media_server_users ──
    op.add_column("media_server_users", sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("media_server_users", sa.Column("expiry_notified", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.add_column("media_server_users", sa.Column("auto_disabled_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("media_server_users", sa.Column("invite_code_id", UUID(as_uuid=True), nullable=True))
    op.create_index("ix_users_expires_at", "media_server_users", ["expires_at"])


def downgrade() -> None:
    op.drop_index("ix_users_expires_at", table_name="media_server_users")
    op.drop_column("media_server_users", "invite_code_id")
    op.drop_column("media_server_users", "auto_disabled_at")
    op.drop_column("media_server_users", "expiry_notified")
    op.drop_column("media_server_users", "expires_at")
    op.drop_table("invite_redemptions")
    op.drop_table("invite_codes")
    op.drop_table("invite_templates")
