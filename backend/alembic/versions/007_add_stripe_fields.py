"""Add Stripe-related columns to media_server_users and app settings

Revision ID: 007
Revises: 006
"""

from alembic import op
import sqlalchemy as sa

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("media_server_users", sa.Column("stripe_customer_id", sa.String(255), nullable=True))
    op.add_column("media_server_users", sa.Column("stripe_subscription_id", sa.String(255), nullable=True))
    op.add_column("media_server_users", sa.Column("subscription_status", sa.String(50), nullable=True))
    op.create_index("ix_users_stripe_customer", "media_server_users", ["stripe_customer_id"])


def downgrade() -> None:
    op.drop_index("ix_users_stripe_customer", table_name="media_server_users")
    op.drop_column("media_server_users", "subscription_status")
    op.drop_column("media_server_users", "stripe_subscription_id")
    op.drop_column("media_server_users", "stripe_customer_id")
