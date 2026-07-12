"""Extend notifications for realtime SSE fan-out metadata."""

from alembic import op
import sqlalchemy as sa

revision = "f1a5c3d8e6b4"
down_revision = "e0f4b2c7d5a3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "notifications",
        sa.Column(
            "category",
            sa.String(length=50),
            nullable=False,
            server_default="system",
        ),
    )
    op.add_column(
        "notifications",
        sa.Column(
            "event_type",
            sa.String(length=100),
            nullable=False,
            server_default="",
        ),
    )
    op.add_column(
        "notifications",
        sa.Column("entity_type", sa.String(length=50), nullable=True),
    )
    op.add_column(
        "notifications",
        sa.Column("entity_id", sa.Uuid(), nullable=True),
    )
    op.add_column(
        "notifications",
        sa.Column("permission_key", sa.String(length=100), nullable=True),
    )
    op.create_index(
        "ix_notifications_user_id_is_read",
        "notifications",
        ["user_id", "is_read"],
    )
    op.create_index(
        "ix_notifications_user_id_created_at",
        "notifications",
        ["user_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_notifications_user_id_created_at", table_name="notifications")
    op.drop_index("ix_notifications_user_id_is_read", table_name="notifications")
    op.drop_column("notifications", "permission_key")
    op.drop_column("notifications", "entity_id")
    op.drop_column("notifications", "entity_type")
    op.drop_column("notifications", "event_type")
    op.drop_column("notifications", "category")
